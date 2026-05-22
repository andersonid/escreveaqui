export interface Attachment {
    id: string;
    displayName: string;
    virtualPath: string;
    sizeBytes: number;
    contentType: string;
    folder: boolean;
    createdAt: string;
}

export interface UploadUrlResponse {
    attachmentId: string;
    uploadUrl: string;
    s3Key: string;
    expiresInSeconds: number;
}

export interface DownloadUrlResponse {
    downloadUrl: string;
    expiresInSeconds: number;
}
