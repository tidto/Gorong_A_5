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

    const handleEventSelect = async (eventId: number) => {
        const selectedEvent = events.find((event) => event.eventId === eventId)
        setComposer((current) => ({
            ...current,
            eventId,
            title: selectedEvent ? `${selectedEvent.title} 후기` : current.title,
        }))
        try {
            const template = await getPostingTemplate(eventId)
            applyTemplate(template, eventId, selectedEvent?.title ?? `행사 #${eventId}`)
        } catch (error) {
            console.error('포스팅 템플릿 조회 실패:', error)
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
        const finalHTMLContents = editorRef.current?.innerHTML || ''
        if (!composer.title.trim() || !composer.reviewText.trim() || composer.rating === 0) {
            alert('제목, 한 줄 리뷰, 발자국 평점을 입력해 주세요.')
            return
        }
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
            if (composer.reviewId) {
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
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-stone-300" />
                    <p className="text-sm text-stone-400 font-light tracking-wide">불러오는 중</p>
                </div>
            </div>
        )
    }

    const isVerified = composer.eventId ? verifiedVenueIds.includes(String(composer.eventId)) : true

    return (
        <div className="min-h-screen bg-stone-50">

            {/* ── 상단 헤더 ── */}
            <header className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/50">
                <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
                    <button
                        onClick={handleCancel}
                        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">목록으로</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors rounded-full hover:bg-stone-100"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => void handleSubmit()}
                            disabled={saving || uploading}
                            className="flex items-center gap-1.5 rounded-full bg-stone-800 hover:bg-stone-900 disabled:opacity-40 px-5 py-1.5 text-sm font-medium text-white transition-all"
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
            </header>

            <div className="mx-auto max-w-3xl px-6 py-10 pb-20">

                {/* ── 행사 선택 ── */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <select
                                className="w-full appearance-none bg-white border border-stone-200 rounded-xl pl-4 pr-9 py-2.5 text-sm text-stone-700 outline-none cursor-pointer hover:border-stone-300 focus:border-stone-400 transition-colors font-medium shadow-sm"
                                value={composer.eventId ?? ''}
                                onChange={(e) => void handleEventSelect(Number(e.target.value))}
                            >
                                <option value="">행사를 선택해 주세요</option>
                                {events.map((event) => (
                                    <option key={event.eventId} value={event.eventId}>
                                        {verifiedVenueIds.includes(String(event.eventId)) ? '● ' : '○ '}{event.title}
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px]">▾</span>
                        </div>

                        {composer.eventId && (
                            <span className={`inline-flex items-center gap-1.5 shrink-0 text-xs font-medium px-3 py-1.5 rounded-full ${
                                isVerified
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                                {isVerified
                                    ? <><CheckCircle2 className="h-3 w-3" /> 인증 완료</>
                                    : <><AlertCircle className="h-3 w-3" /> 인증 필요</>
                                }
                            </span>
                        )}
                    </div>

                    {composer.eventId && !isVerified && (
                        <p className="mt-2.5 text-xs text-amber-600/80 pl-1 leading-relaxed">
                            앱에서 지오펜싱 인증을 완료해야 포스팅할 수 있습니다.
                        </p>
                    )}
                </div>

                {/* ── 글쓰기 영역 ── */}
                <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm overflow-hidden">

                    {/* 제목 */}
                    <div className="px-8 pt-8 pb-0">
                        <input
                            type="text"
                            className="w-full text-[1.6rem] font-semibold text-stone-800 placeholder-stone-200 outline-none bg-transparent leading-tight tracking-tight"
                            placeholder="제목"
                            value={composer.title}
                            onChange={(e) => setComposer(current => ({ ...current, title: e.target.value }))}
                        />
                        <p className="mt-2 text-xs text-stone-300 font-light">{authorName}</p>
                    </div>

                    <div className="mx-8 mt-6 h-px bg-stone-100" />

                    {/* 한 줄 리뷰 + 평점 */}
                    <div className="px-8 py-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">한 줄 리뷰</span>
                            <PawRating
                                value={composer.rating}
                                onChange={(rating) => setComposer(current => ({ ...current, rating }))}
                                readOnly={!composer.reviewMetaEditable}
                            />
                        </div>
                        <textarea
                            className="w-full resize-none bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-700 placeholder-stone-300 outline-none leading-relaxed border border-transparent focus:border-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={2}
                            value={composer.reviewText}
                            onChange={(e) => setComposer(current => ({ ...current, reviewText: e.target.value }))}
                            disabled={!composer.reviewMetaEditable}
                            placeholder="행사에 대한 인상을 한 줄로 남겨 주세요."
                        />
                        {!composer.reviewMetaEditable && (
                            <p className="mt-2 text-xs text-rose-400/80">한 줄 리뷰와 평점은 작성 후 7일이 지나 수정이 잠겼습니다.</p>
                        )}
                    </div>

                    <div className="mx-8 h-px bg-stone-100" />

                    {/* 사진 첨부 */}
                    <div className="px-8 py-5">
                        <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest block mb-3">사진</span>

                        <div className="flex gap-2 flex-wrap">
                            {composer.images.map((image, index) => (
                                <div key={`${image.imageUrl}-${index}`} className="relative group w-20 h-20 rounded-xl overflow-hidden">
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
                                            <X className="h-3 w-3 text-stone-700" />
                                        </div>
                                    </button>
                                </div>
                            ))}

                            {composer.images.length < 5 && (
                                <label className="w-20 h-20 rounded-xl border border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                                    {uploading
                                        ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                                        : <ImagePlus className="h-4 w-4 text-stone-300" />
                                    }
                                    <span className="text-[10px] text-stone-300">{composer.images.length}/5</span>
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

                    <div className="mx-8 h-px bg-stone-100" />

                    {/* 본문 에디터 */}
                    <div className="px-8 pt-4 pb-8">

                        {/* 서식 툴바 */}
                        <div className="flex items-center gap-0.5 pb-3 mb-1 border-b border-stone-100 select-none flex-wrap">
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
                                    className={`p-1.5 rounded-lg transition-all ${
                                        activeFormats[key]
                                            ? 'bg-stone-800 text-white'
                                            : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                </button>
                            ))}

                            <div className="w-px h-3.5 bg-stone-200 mx-1.5" />

                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); execEditorCommand('foreColor', '#ea580c') }}
                                title="강조색"
                                className="p-1.5 rounded-lg text-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all"
                            >
                                <Type className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-3.5 bg-stone-200 mx-1.5" />

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
                                    className={`p-1.5 rounded-lg transition-all ${
                                        activeFormats[key]
                                            ? 'bg-stone-800 text-white'
                                            : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'
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
                            className="min-h-[360px] w-full text-[15px] leading-[1.9] text-stone-700 outline-none blog-editable-area pt-3"
                            data-placeholder="행사 경험을 자유롭게 풀어 써 주세요."
                        />
                    </div>
                </div>

                {/* 하단 여백 힌트 */}
                <p className="mt-4 text-center text-[11px] text-stone-300 tracking-wide">
                    게시 후에도 언제든지 수정할 수 있습니다
                </p>
            </div>

            <style>{`
                .blog-editable-area:empty:before {
                    content: attr(data-placeholder);
                    color: #d6d3d1;
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