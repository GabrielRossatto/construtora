package com.construtora.services;

import com.construtora.dtos.EmpreendimentoDtos;
import com.construtora.dtos.MaterialDtos;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IaContextCacheService {

    private final ConcurrentHashMap<String, CacheEntry<ConsultaPrecoCacheData>> consultaPrecoCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<ContextoEstaticoCacheData>> contextoEstaticoCache = new ConcurrentHashMap<>();
    private final Duration ttl;

    public IaContextCacheService(@Value("${app.ai.context-cache-ttl-seconds:90}") long ttlSeconds) {
        this.ttl = Duration.ofSeconds(Math.max(10, ttlSeconds));
    }

    public Optional<ConsultaPrecoCacheData> getConsultaPreco(Long empresaId, Long empreendimentoId) {
        return get(consultaPrecoCache, key(empresaId, empreendimentoId));
    }

    public void putConsultaPreco(Long empresaId, Long empreendimentoId, ConsultaPrecoCacheData data) {
        put(consultaPrecoCache, key(empresaId, empreendimentoId), data);
    }

    public Optional<ContextoEstaticoCacheData> getContextoEstatico(Long empresaId, Long empreendimentoId) {
        return get(contextoEstaticoCache, key(empresaId, empreendimentoId));
    }

    public void putContextoEstatico(Long empresaId, Long empreendimentoId, ContextoEstaticoCacheData data) {
        put(contextoEstaticoCache, key(empresaId, empreendimentoId), data);
    }

    public void invalidateEmpreendimento(Long empresaId, Long empreendimentoId) {
        String key = key(empresaId, empreendimentoId);
        consultaPrecoCache.remove(key);
        contextoEstaticoCache.remove(key);
    }

    private String key(Long empresaId, Long empreendimentoId) {
        return empresaId + ":" + empreendimentoId;
    }

    private <T> Optional<T> get(ConcurrentHashMap<String, CacheEntry<T>> cache, String key) {
        CacheEntry<T> entry = cache.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.expireAt().isBefore(Instant.now())) {
            cache.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry.value());
    }

    private <T> void put(ConcurrentHashMap<String, CacheEntry<T>> cache, String key, T value) {
        cache.put(key, new CacheEntry<>(value, Instant.now().plus(ttl)));
    }

    public record ConsultaPrecoCacheData(
            String nomeEmpreendimento,
            Map<String, Object> empreendimento,
            List<Map<String, Object>> unidades,
            BigDecimal precoReferencia,
            boolean possuiReservado
    ) {}

    public record ContextoEstaticoCacheData(
            List<EmpreendimentoDtos.EmpreendimentoResponse> empreendimentosFiltrados,
            List<MaterialDtos.MaterialResponse> materiaisFiltrados,
            List<Map<String, Object>> inventarioTabela,
            BigDecimal precoReferencia,
            boolean possuiReservado
    ) {}

    private record CacheEntry<T>(
            T value,
            Instant expireAt
    ) {}
}
