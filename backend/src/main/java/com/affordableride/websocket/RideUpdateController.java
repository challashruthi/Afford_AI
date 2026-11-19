package com.affordableride.websocket;

import com.affordableride.dto.WebSocketUpdateMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class RideUpdateController {

    @MessageMapping("/request-update")
    @SendTo("/topic/ride-updates")
    public WebSocketUpdateMessage sendManualUpdate(String message) {
        return new WebSocketUpdateMessage("MANUAL_TRIGGER", "Live update requested: " + message, null);
    }
}
