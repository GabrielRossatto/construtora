package com.construtora.controllers;

import com.construtora.dtos.UserDtos;
import com.construtora.services.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'CREATE_USER')")
    public UserDtos.UserResponse create(@Valid @RequestBody UserDtos.CreateUserRequest request,
                                        HttpServletRequest httpRequest) {
        return userService.create(request, httpRequest);
    }

    @GetMapping
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_USER')")
    public List<UserDtos.UserResponse> list() {
        return userService.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.hasPermission(authentication, 'VIEW_USER')")
    public UserDtos.UserResponse getById(@PathVariable Long id) {
        return userService.getById(id);
    }
}
