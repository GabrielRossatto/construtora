package com.construtora.security;

public final class TenantContext {

    private static final ThreadLocal<Long> EMPRESA_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static void setEmpresaId(Long empresaId) {
        EMPRESA_ID.set(empresaId);
    }

    public static Long getEmpresaId() {
        return EMPRESA_ID.get();
    }

    public static void clear() {
        EMPRESA_ID.remove();
    }
}
