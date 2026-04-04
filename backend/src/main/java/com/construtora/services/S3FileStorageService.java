package com.construtora.services;

import com.construtora.exceptions.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class S3FileStorageService implements FileStorageService {

    private final S3Client s3Client;
    private final String bucket;
    private final String endpoint;
    private final String publicBaseUrl;
    private final boolean forcePathStyle;
    private final boolean publicRead;

    public S3FileStorageService(S3Client s3Client,
                                @Value("${app.storage.bucket}") String bucket,
                                @Value("${app.storage.endpoint:}") String endpoint,
                                @Value("${app.storage.public-base-url:}") String publicBaseUrl,
                                @Value("${app.storage.force-path-style:true}") boolean forcePathStyle,
                                @Value("${app.storage.public-read:true}") boolean publicRead) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.publicBaseUrl = publicBaseUrl;
        this.forcePathStyle = forcePathStyle;
        this.publicRead = publicRead;
    }

    @Override
    public StoredFile upload(Long empresaId, String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Arquivo obrigatório");
        }

        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }

        String key = "empresa-%d/%s/%d-%s%s".formatted(
                empresaId,
                folder,
                Instant.now().toEpochMilli(),
                UUID.randomUUID(),
                ext
        );

        try {
            ensureBucketExists();

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .acl(publicRead ? ObjectCannedACL.PUBLIC_READ : null)
                    .build();

            s3Client.putObject(request, software.amazon.awssdk.core.sync.RequestBody.fromBytes(file.getBytes()));

            String url = resolvePublicUrl(key);
            return new StoredFile(key, url, file.getContentType(), file.getSize());
        } catch (IOException e) {
            throw new BadRequestException("Falha ao processar arquivo");
        } catch (Exception e) {
            throw new BadRequestException("Falha ao enviar arquivo para o storage");
        }
    }

    @Override
    public byte[] downloadByUrl(String fileUrl) {
        try {
            String key = extractKeyFromUrl(fileUrl);
            return s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build()).asByteArray();
        } catch (Exception e) {
            throw new BadRequestException("Falha ao baixar arquivo do storage");
        }
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception e) {
            String errorCode = e.awsErrorDetails() != null ? e.awsErrorDetails().errorCode() : "";
            if (e.statusCode() == 404 || "NotFound".equalsIgnoreCase(errorCode) || "NoSuchBucket".equalsIgnoreCase(errorCode)) {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } else {
                throw e;
            }
        }
    }

    private String resolvePublicUrl(String key) {
        String base = (publicBaseUrl != null && !publicBaseUrl.isBlank()) ? publicBaseUrl : endpoint;
        if (base != null && !base.isBlank()) {
            String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
            if (forcePathStyle) {
                return "%s/%s/%s".formatted(normalized, bucket, key);
            }
            return "%s/%s".formatted(normalized, key);
        }
        return "https://%s.s3.amazonaws.com/%s".formatted(bucket, key);
    }

    private String extractKeyFromUrl(String fileUrl) {
        URI uri = URI.create(fileUrl);
        String path = uri.getPath() == null ? "" : uri.getPath();
        String prefix = "/" + bucket + "/";
        if (path.startsWith(prefix)) {
          return path.substring(prefix.length());
        }
        if (path.startsWith("/")) {
          return path.substring(1);
        }
        return path;
    }
}
