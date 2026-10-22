import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ArrowLeft, ImagePlus, Loader2,
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Type, Send,
    X, CheckCircle2, AlertCircle
} from 'lucide-react'
import PawRating from '../components/PawRating'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileToS3 } from '../api/fileApi'
import {
    getMyVerifiedVenueIds,
    getParticipatedEvents,
    getPostingTemplate,
    publishPosting,
    updatePosting,
    type ImagePayload,
    type ParticipatedEvent,
    type ReviewDetail,
} from '../api/reviewService'
import { optimizeImageFile } from '../utils/imageUpload'

type ComposerState = {
    reviewId: number | null
    eventId: number | null
    title: string
    reviewText: string
    rating: number
    contents: string
    images: ImagePayload[]
    status: 'REVIEW_ONLY' | 'PUBLISHED' | null
    reviewMetaEditable: boolean
}

const initialComposer: ComposerState = {
    reviewId: null,
    eventId: null,
    title: '',
    reviewText: '',
    rating: 0,
    contents: '',
    images: [],
    status: null,
    reviewMetaEditable: true,
}

export default function PostingComposePage() {
    const auth = useAuth()
    const navigate = useNavigate()
    const { eventId: eventIdParam } = useParams<{ eventId: string }>()

    const [events, setEvents] = useState<ParticipatedEvent[]>([])
    const [verifiedVenueIds, setVerifiedVenueIds] = useState<string[]>([])
    const [composer, setComposer] = useState<ComposerState>(initialComposer)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    const editorRef = useRef<HTMLDivElement>(null)
    const lastInjectedContents = useRef<string | null>(null)
    const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})

    const updateActiveFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikeThrough: document.queryCommandState('strikeThrough'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
        })
    }

    const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명'

    const execEditorCommand = (command: string, value: string = '') => {
        if (!editorRef.current) return
        editorRef.current.focus()
        document.execCommand(command, false, value)
        setComposer(current => ({ ...current, contents: editorRef.current?.innerHTML ?? '' }))
        updateActiveFormats()
    }

    const applyTemplate = (template: ReviewDetail | null, eventId: number, eventTitle: string) => {
        const defaultTitle = `${eventTitle} 후기`
        if (!template) {
            setComposer({ ...initialComposer, eventId, title: defaultTitle })
            return
        }
        setComposer({
            reviewId: template.id,
            eventId,
            title: template.title?.trim() || defaultTitle,
            reviewText: template.reviewText ?? '',
            rating: template.rating ?? 0,
            contents: template.contents ?? '',
            images: template.images.map((image) => ({
                imageUrl: image.imageUrl,
                originalImgName: image.originalImgName ?? 'uploaded-image.webp',
                saveImgName: image.saveImgName ?? image.imageUrl.split('/').pop() ?? 'image.webp',
            })),
            status: template.status,
            reviewMetaEditable: template.reviewMetaEditable,
        })
    }

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            try {
                const [eventList, verified] = await Promise.all([
                    getParticipatedEvents().catch((error) => {
                        console.error('참여 행사 조회 실패:', error)
                        return [] as ParticipatedEvent[]
                    }),
                    getMyVerifiedVenueIds().catch(() => [] as string[]),
                ])
                setEvents(eventList)
                setVerifiedVenueIds(verified)

                if (eventIdParam) {
                    const eventId = Number(eventIdParam)
                    const selectedEvent = eventList.find((event) => event.eventId === eventId)
                    try {
                        const template = await getPostingTemplate(eventId)
                        applyTemplate(template, eventId, selectedEvent?.title ?? `행사 #${eventId}`)
                    } catch (error) {
                        console.error('포스팅 템플릿 조회 실패:', error)
                        setComposer({
                            ...initialComposer,
                            eventId,
                            title: selectedEvent ? `${selectedEvent.title} 후기` : '',
                        })
                    }
                }
            } finally {
                setLoading(false)
            }
        }
        void init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventIdParam])

    useEffect(() => {
        if (loading) return
        if (!editorRef.current) return
        if (lastInjectedContents.current === composer.contents) return
        editorRef.current.innerHTML = composer.contents || ''
        lastInjectedContents.current = composer.contents || ''
    }, [loading])

    // [버그 수정 3] 행사 변경 시 reviewId를 먼저 null로 초기화한 뒤
    // 새 template을 받아 덮어씁니다. getPostingTemplate 실패 시에도
    // 이전 행사의 reviewId가 남지 않습니다.
    const handleEventSelect = async (eventId: number) => {
        const selectedEvent = events.find((event) => event.eventId === eventId)

        // 선택된 행사에 맞게 미리 초기화 (reviewId = null 포함)
        setComposer({
            ...initialComposer,
            eventId,
            title: selectedEvent ? `${selectedEvent.title} 후기` : '',
        })

        try {
            const template = await getPostingTemplate(eventId)
            applyTemplate(template, eventId, selectedEvent?.title ?? `행사 #${eventId}`)
        } catch (error) {
            console.error('포스팅 템플릿 조회 실패:', error)
            // 실패해도 이미 위에서 초기화했으므로 이전 reviewId가 남지 않음
        }
    }

    const handleImageUpload = async (files: FileList | null) => {
        if (!files?.length) return
        const pickedFiles = Array.from(files)
        if (composer.images.length + pickedFiles.length > 5) {
            alert('이미지는 최대 5장까지 첨부할 수 있습니다.')
            return
        }
        setUploading(true)
        try {
            const uploaded: ImagePayload[] = []
            for (const file of pickedFiles) {
                const optimized = await optimizeImageFile(file)
                const response = await uploadFileToS3(optimized, 'POST_PHOTO', true)
                uploaded.push({
                    imageUrl: response.fileUrl,
                    originalImgName: file.name,
                    saveImgName: String(response.key).split('/').pop() ?? file.name,
                })
                if (editorRef.current) {
                    editorRef.current.focus()
                    document.execCommand('insertImage', false, response.fileUrl)
                }
            }
            setComposer((current) => ({
                ...current,
                images: [...current.images, ...uploaded],
            }))
        } catch (error) {
            console.error('이미지 업로드 실패:', error)
            alert('이미지 업로드 중 오류가 발생했습니다.')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async () => {
        if (!composer.eventId) { alert('행사를 선택해 주세요.'); return }
        if (!verifiedVenueIds.includes(String(composer.eventId))) {
            alert('현장 방문 인증이 완료된 행사만 포스팅할 수 있습니다.')
            return
        }
        if (!composer.title.trim() || !composer.reviewText.trim() || composer.rating === 0) {
            alert('제목, 한 줄 리뷰, 발자국 평점을 입력해 주세요.')
            return
        }

        // [버그 수정 2] editorRef가 null일 때 빈 문자열로 저장되는 것을 방지합니다.
        // editorRef를 우선 참조하되, null이면 state의 contents를 fallback으로 사용합니다.
        const finalHTMLContents = editorRef.current?.innerHTML ?? composer.contents

        setSaving(true)
        try {
            const payload = {
                reviewId: composer.reviewId,
                eventId: composer.eventId,
                title: composer.title.trim(),
                reviewText: composer.reviewText.trim(),
                rating: composer.rating,
                contents: finalHTMLContents.trim(),
                authorName,
                images: composer.images,
            }

            // [버그 수정 1] 기존에는 reviewId 유무만으로 PUT/POST를 분기했습니다.
            // 그러나 reviewId는 간편 리뷰만 작성한 경우에도 존재하므로,
            // status === 'PUBLISHED'(이미 게시된 포스팅)일 때만 PUT(수정)을 사용하고
            // 그 외(신규 포스팅, 간편 리뷰 업그레이드)는 POST를 사용합니다.
            if (composer.status === 'PUBLISHED' && composer.reviewId) {
                await updatePosting(composer.reviewId, payload)
            } else {
                await publishPosting(payload)
            }
            navigate('/reviews')
        } catch (error: any) {
            console.error('포스팅 저장 실패:', error)
            alert(error?.response?.data?.error || '포스팅 저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => navigate('/reviews')

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    <p className="text-sm text-slate-400 font-light tracking-wide">불러오는 중</p>
                </div>
            </div>
        )
    }

    const isVerified = composer.eventId ? verifiedVenueIds.includes(String(composer.eventId)) : true

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">

            {/* ── 상단 헤더 ── */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200/60 shadow-sm">
                <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-6">
                    {/* 왼쪽: 뒤로가기 + 행사 선택 */}
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm hidden sm:inline">목록으로</span>
                        </button>

                        <div className="w-px h-5 bg-slate-200 shrink-0" />

                        {/* 행사 선택 인라인 */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="relative">
                                <select
                                    className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-orange-400 transition-colors font-medium max-w-[220px] truncate"
                                    value={composer.eventId ?? ''}
                                    onChange={(e) => void handleEventSelect(Number(e.target.value))}
                                >
                                    <option value="">행사 선택</option>
                                    {events.map((event) => (
                                        <option key={event.eventId} value={event.eventId}>
                                            {verifiedVenueIds.includes(String(event.eventId)) ? '● ' : '○ '}{event.title}
                                        </option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
                            </div>

                            {composer.eventId && (
                                <span className={`inline-flex items-center gap-1 shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                                    isVerified
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                    {isVerified
                                        ? <><CheckCircle2 className="h-3 w-3" /> 인증</>
                                        : <><AlertCircle className="h-3 w-3" /> 미인증</>
                                    }
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽: 작성자 + 액션 버튼 */}
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 hidden md:block">{authorName}</span>
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => void handleSubmit()}
                            disabled={saving || uploading}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 px-4 py-1.5 text-sm font-medium text-white transition-all"
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            {saving ? '저장 중...' : composer.status === 'PUBLISHED' ? '수정하기' : '게시하기'}
                        </button>
                    </div>
                </div>

                {/* 미인증 경고 배너 */}
                {composer.eventId && !isVerified && (
                    <div className="bg-amber-50 border-t border-amber-100 px-6 py-2 text-center">
                        <p className="text-xs text-amber-600">앱에서 지오펜싱 인증을 완료해야 포스팅할 수 있습니다.</p>
                    </div>
                )}
            </header>

            {/* ── 메인 2단 레이아웃 ── */}
            <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-6 flex gap-6 items-start">

                {/* ── 왼쪽 사이드바: 메타 정보 ── */}
                <aside className="w-72 shrink-0 flex flex-col gap-4 sticky top-[57px]">

                    {/* 제목 + 작성자 */}
                    <div className="bg-white rounded-xl border border-slate-200/50 shadow-sm p-5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">제목</label>
                        <input
                            type="text"
                            className="w-full text-base font-semibold text-slate-800 placeholder-slate-300 outline-none bg-transparent leading-snug"
                            placeholder="포스팅 제목"
                            value={composer.title}
                            onChange={(e) => setComposer(current => ({ ...current, title: e.target.value }))}
                        />
                    </div>

                    {/* 평점 + 한 줄 리뷰 */}
                    <div className="bg-white rounded-xl border border-slate-200/50 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">평점</label>
                            <PawRating
                                value={composer.rating}
                                onChange={(rating) => setComposer(current => ({ ...current, rating }))}
                                readOnly={!composer.reviewMetaEditable}
                            />
                        </div>
                        <textarea
                            className="w-full resize-none bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 outline-none leading-relaxed border border-transparent focus:border-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={3}
                            value={composer.reviewText}
                            onChange={(e) => setComposer(current => ({ ...current, reviewText: e.target.value }))}
                            disabled={!composer.reviewMetaEditable}
                            placeholder="행사에 대한 인상을 한 줄로 남겨 주세요."
                        />
                        {!composer.reviewMetaEditable && (
                            <p className="mt-2 text-xs text-rose-500 leading-relaxed">평점과 한 줄 리뷰는 작성 후 7일이 지나 수정이 잠겼습니다.</p>
                        )}
                    </div>

                    {/* 사진 첨부 */}
                    <div className="bg-white rounded-xl border border-slate-200/50 shadow-sm p-5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-3">사진</label>
                        <div className="grid grid-cols-3 gap-2">
                            {composer.images.map((image, index) => (
                                <div key={`${image.imageUrl}-${index}`} className="relative group aspect-square rounded-lg overflow-hidden">
                                    <img src={image.imageUrl} alt={`사진 ${index + 1}`} className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        onClick={() => setComposer(current => ({
                                            ...current,
                                            images: current.images.filter((_, i) => i !== index),
                                        }))}
                                    >
                                        <div className="bg-white/90 rounded-full p-1">
                                            <X className="h-3 w-3 text-slate-700" />
                                        </div>
                                    </button>
                                </div>
                            ))}

                            {composer.images.length < 5 && (
                                <label className="aspect-square rounded-lg border border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-orange-300 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                                    {uploading
                                        ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        : <ImagePlus className="h-4 w-4 text-slate-300" />
                                    }
                                    <span className="text-[10px] text-slate-400">{composer.images.length}/5</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => void handleImageUpload(e.target.files)}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-[11px] text-slate-400 tracking-wide">
                        게시 후에도 언제든지 수정할 수 있습니다
                    </p>
                </aside>

                {/* ── 오른쪽: 본문 에디터 ── */}
                <main className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 100px)' }}>

                    {/* 서식 툴바 */}
                    <div className="flex items-center gap-0.5 px-6 py-3 border-b border-slate-100 select-none bg-slate-50/60">
                        {[
                            { cmd: 'bold', icon: Bold, label: '굵게', key: 'bold' },
                            { cmd: 'italic', icon: Italic, label: '기울임', key: 'italic' },
                            { cmd: 'underline', icon: Underline, label: '밑줄', key: 'underline' },
                            { cmd: 'strikeThrough', icon: Strikethrough, label: '취소선', key: 'strikeThrough' },
                        ].map(({ cmd, icon: Icon, label, key }) => (
                            <button
                                key={cmd}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); execEditorCommand(cmd) }}
                                title={label}
                                className={`p-1.5 rounded-md transition-all ${
                                    activeFormats[key]
                                        ? 'bg-orange-500 text-white'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        ))}

                        <div className="w-px h-3.5 bg-slate-200 mx-2" />

                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); execEditorCommand('foreColor', '#ea580c') }}
                            title="강조색"
                            className="p-1.5 rounded-md text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                        >
                            <Type className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-3.5 bg-slate-200 mx-2" />

                        {[
                            { cmd: 'justifyLeft', icon: AlignLeft, label: '왼쪽 정렬', key: 'justifyLeft' },
                            { cmd: 'justifyCenter', icon: AlignCenter, label: '가운데 정렬', key: 'justifyCenter' },
                            { cmd: 'justifyRight', icon: AlignRight, label: '오른쪽 정렬', key: 'justifyRight' },
                        ].map(({ cmd, icon: Icon, label, key }) => (
                            <button
                                key={cmd}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); execEditorCommand(cmd) }}
                                title={label}
                                className={`p-1.5 rounded-md transition-all ${
                                    activeFormats[key]
                                        ? 'bg-orange-500 text-white'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        ))}
                    </div>

                    {/* 본문 입력 */}
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => {
                            if (editorRef.current) {
                                setComposer(current => ({ ...current, contents: editorRef.current!.innerHTML }))
                            }
                        }}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        className="flex-1 w-full text-[15px] leading-[1.9] text-slate-700 outline-none blog-editable-area px-8 py-6"
                        data-placeholder="행사 경험을 자유롭게 풀어 써 주세요."
                    />
                </main>
            </div>

            <style>{`
                .blog-editable-area:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    cursor: text;
                    white-space: pre-line;
                    pointer-events: none;
                }
                .blog-editable-area img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 12px 0;
                    display: block;
                }
                .blog-editable-area:focus {
                    outline: none;
                }
            `}</style>
        </div>
    )
}