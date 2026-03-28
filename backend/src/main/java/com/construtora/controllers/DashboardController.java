package com.construtora.controllers;

import com.construtora.dtos.DashboardDtos;
import com.construtora.services.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_DEVELOPMENT')")
    public DashboardDtos.DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }

    @GetMapping("/metrics")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_DEVELOPMENT')")
    public DashboardDtos.MetricResponse metrics() {
        return dashboardService.getDashboard().metrics();
    }
}
