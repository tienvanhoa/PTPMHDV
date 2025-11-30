package com.auth.auth_service.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus; // Import các DTO vừa tạo
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth.auth_service.dto.AuthResponse;
import com.auth.auth_service.dto.LoginRequest;
import com.auth.auth_service.dto.RegisterRequest;
import com.auth.auth_service.models.User;
import com.auth.auth_service.services.AuthService;

import lombok.Data;

@Data
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // Đăng ký
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        try {
            User newUser = authService.register(request);
            // Trả về thông báo thành công, tránh trả về cả cục User chứa password hash
            return ResponseEntity.status(HttpStatus.CREATED).body("Đăng ký thành công cho email: " + newUser.getEmail());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }
    
    // API xác thực token (Dành cho API Gateway hoặc service khác gọi để kiểm tra)
    @GetMapping("/validate")
    public ResponseEntity<String> validateToken() {
        return ResponseEntity.ok("Token is valid");
    }
}