package com.gorong.backend.domain.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.gorong.backend.domain.admin.repository.UserBanRepository;
import com.gorong.backend.domain.auth.dto.GithubLoginResponseDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GithubAuthService {

    private static final String GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
    private static final String GITHUB_USER_URL = "https://api.github.com/user";
    private static final String GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserBanRepository userBanRepository;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${github.oauth.client-id}")
    private String clientId;

    @Value("${github.oauth.client-secret}")
    private String clientSecret;

    @Transactional
    public GithubLoginResponseDto login(String code, String redirectUri, String codeVerifier) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("GitHub 로그인 code가 필요합니다.");
        }

        GitHubTokenResponse tokenResponse = exchangeCodeForToken(code.trim(), redirectUri, codeVerifier);
        GitHubUserResponse githubUser = fetchGithubUser(tokenResponse.accessToken());
        String email = resolvePrimaryEmail(tokenResponse.accessToken(), githubUser);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("GitHub 이메일을 확인할 수 없습니다.");
        }

        String githubFirebaseUid = "github:" + githubUser.id();
        Optional<User> matchedByEmail = userRepository.findByEmail(email);
        Optional<User> matchedByUid = userRepository.findByFirebaseUid(githubFirebaseUid);

        String firebaseUid;
        boolean registered = false;
        String nickname = githubUser.login();

        if (matchedByEmail.isPresent()) {
            User user = matchedByEmail.get();
            firebaseUid = user.getFirebaseUid();
            registered = true;
            nickname = userProfileRepository.findByUserId(user.getId())
                    .map(UserProfile::getNickname)
                    .orElse(githubUser.name() != null && !githubUser.name().isBlank() ? githubUser.name() : githubUser.login());
        } else if (matchedByUid.isPresent()) {
            User user = matchedByUid.get();
            firebaseUid = user.getFirebaseUid();
            registered = true;
            nickname = userProfileRepository.findByUserId(user.getId())
                    .map(UserProfile::getNickname)
                    .orElse(githubUser.name() != null && !githubUser.name().isBlank() ? githubUser.name() : githubUser.login());
        } else {
            firebaseUid = githubFirebaseUid;
            if (userBanRepository.existsByFirebaseUidOrEmail(firebaseUid, email)) {
                throw new IllegalArgumentException("이 계정은 이용이 제한되어 있습니다.");
            }
        }

        if (userBanRepository.existsByFirebaseUidOrEmail(firebaseUid, email)) {
            throw new IllegalArgumentException("이 계정은 이용이 제한되어 있습니다.");
        }

        String customToken;
        try {
            customToken = FirebaseAuth.getInstance().createCustomToken(
                    firebaseUid,
                    Map.of(
                            "provider", "github",
                            "githubId", String.valueOf(githubUser.id()),
                            "email", email
                    )
            );
        } catch (Exception e) {
            throw new RuntimeException("Firebase custom token 생성에 실패했습니다.", e);
        }

        return GithubLoginResponseDto.builder()
                .customToken(customToken)
                .isRegistered(registered)
                .email(email)
                .firebaseUid(firebaseUid)
                .nickname(nickname)
                .message(registered ? "기존 계정 로그인 성공" : "GitHub 인증 성공. 추가 정보 입력이 필요합니다.")
                .build();
    }

    private GitHubTokenResponse exchangeCodeForToken(String code, String redirectUri, String codeVerifier) {
        try {
            StringBuilder bodyBuilder = new StringBuilder();
            bodyBuilder.append("client_id=").append(encodeForm(clientId));
            bodyBuilder.append("&client_secret=").append(encodeForm(clientSecret));
            bodyBuilder.append("&code=").append(encodeForm(code));
            if (redirectUri != null && !redirectUri.isBlank()) {
                bodyBuilder.append("&redirect_uri=").append(encodeForm(redirectUri));
            }
            if (codeVerifier != null && !codeVerifier.isBlank()) {
                bodyBuilder.append("&code_verifier=").append(encodeForm(codeVerifier));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GITHUB_TOKEN_URL))
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(bodyBuilder.toString()))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalArgumentException("GitHub 토큰 교환에 실패했습니다.");
            }

            JsonNode node = objectMapper.readTree(response.body());
            String accessToken = node.path("access_token").asText(null);
            if (accessToken == null || accessToken.isBlank()) {
                String error = node.path("error_description").asText(node.path("error").asText("unknown_error"));
                throw new IllegalArgumentException("GitHub 토큰 응답 오류: " + error);
            }

            return new GitHubTokenResponse(accessToken);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("GitHub 토큰 교환 중 오류가 발생했습니다.", e);
        }
    }

    private GitHubUserResponse fetchGithubUser(String accessToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GITHUB_USER_URL))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalArgumentException("GitHub 사용자 정보를 불러오지 못했습니다.");
            }

            JsonNode node = objectMapper.readTree(response.body());
            long id = node.path("id").asLong(0L);
            String login = node.path("login").asText("");
            String name = node.path("name").asText(null);
            String email = node.path("email").asText(null);
            if (id == 0L || login.isBlank()) {
                throw new IllegalArgumentException("GitHub 사용자 정보가 올바르지 않습니다.");
            }
            return new GitHubUserResponse(id, login, name, email);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("GitHub 사용자 조회 중 오류가 발생했습니다.", e);
        }
    }

    private String resolvePrimaryEmail(String accessToken, GitHubUserResponse user) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GITHUB_EMAILS_URL))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.isArray()) {
                    for (JsonNode emailNode : root) {
                        boolean primary = emailNode.path("primary").asBoolean(false);
                        boolean verified = emailNode.path("verified").asBoolean(false);
                        String email = emailNode.path("email").asText(null);
                        if (primary && verified && email != null && !email.isBlank()) {
                            return email;
                        }
                    }
                    for (JsonNode emailNode : root) {
                        boolean verified = emailNode.path("verified").asBoolean(false);
                        String email = emailNode.path("email").asText(null);
                        if (verified && email != null && !email.isBlank()) {
                            return email;
                        }
                    }
                    for (JsonNode emailNode : root) {
                        String email = emailNode.path("email").asText(null);
                        if (email != null && !email.isBlank()) {
                            return email;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // 이메일 목록 조회 실패 시 user.email fallback으로 진행
        }

        return user.email();
    }

    private String encodeForm(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record GitHubTokenResponse(String accessToken) {}

    private record GitHubUserResponse(long id, String login, String name, String email) {}
}
