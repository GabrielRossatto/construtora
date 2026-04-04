package com.construtora.controllers;

import com.construtora.dtos.IaDtos;
import com.construtora.services.EmpresaService;
import com.construtora.services.IAService;
import com.construtora.services.IntentClassifierService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ia")
public class IAController {

    private final IAService iaService;
    private final IntentClassifierService intentClassifierService;
    private final EmpresaService empresaService;

    public IAController(IAService iaService,
                        IntentClassifierService intentClassifierService,
                        EmpresaService empresaService) {
        this.iaService = iaService;
        this.intentClassifierService = intentClassifierService;
        this.empresaService = empresaService;
    }

    @PostMapping("/perguntar")
    public IaDtos.RespostaDTO perguntar(@RequestBody @Valid IaDtos.PerguntaRequestDTO request) {
        empresaService.ensureIaEnabledForCurrentCompany();
        return iaService.perguntar(request);
    }

    @PostMapping("/classificar-intencao")
    public IaDtos.ClassificacaoIntencaoResponseDTO classificarIntencao(
            @RequestBody @Valid IaDtos.ClassificacaoIntencaoRequestDTO request
    ) {
        empresaService.ensureIaEnabledForCurrentCompany();
        return intentClassifierService.classificarIntencao(request.pergunta());
    }

    @GetMapping("/interacoes")
    public List<IaDtos.InteracaoResponseDTO> listarInteracoes() {
        empresaService.ensureIaEnabledForCurrentCompany();
        return iaService.listarInteracoesRecentes();
    }
}
