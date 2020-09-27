const MimetypesKind = {
    opus: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/mp4',
    m4v: 'video/mp4',
    mkv: 'video/x-matroska',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    caf: 'audio/x-caf',
    flac: 'audio/flac',
    oga: 'audio/ogg',
    wav: 'audio/wav',
    m3u8: 'application/x-mpegURL',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
};

class VideoService {

    static getFileExtension(uri) {
        return uri.substring(uri.lastIndexOf(".") + 1).trim();
    }

    static getMimetype = function (url) {
        const ext = VideoService.getFileExtension(url);
        return MimetypesKind[ext.toLowerCase()];
    };
}

export default VideoService;
