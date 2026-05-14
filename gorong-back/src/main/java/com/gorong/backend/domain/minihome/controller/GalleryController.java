package com.gorong.backend.domain.minihome.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryController {

    @GetMapping("/test")
    public String test() {
        return "gallery api success";
    }
}
