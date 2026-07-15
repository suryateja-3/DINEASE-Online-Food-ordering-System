package com.foodordering.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String body) {
        if (to == null || to.trim().isEmpty()) {
            return;
        }
        try {
            if (mailSender != null) {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(to.trim());
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                System.out.println(">>> [Email Sent Successfully] To: " + to + " | Subject: " + subject);
            } else {
                printMockEmail(to, subject, body);
            }
        } catch (Exception e) {
            System.err.println(">>> [Email Delivery Failed] To: " + to + " | Error: " + e.getMessage());
            printMockEmail(to, subject, body);
        }
    }

    private void printMockEmail(String to, String subject, String body) {
        System.out.println("==================================================");
        System.out.println("MOCK EMAIL PRINT OUT (JavaMailSender Offline)");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body:");
        System.out.println(body);
        System.out.println("==================================================");
    }
}
