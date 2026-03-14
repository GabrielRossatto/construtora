package com.construtora.services;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    StoredFile upload(Long empresaId, String folder, MultipartFile file);

    record StoredFile(String url, String contentType, long size) {}
}
