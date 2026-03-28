package com.construtora.services;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    StoredFile upload(Long empresaId, String folder, MultipartFile file);
    byte[] downloadByUrl(String fileUrl);

    record StoredFile(String key, String url, String contentType, long size) {}
}
