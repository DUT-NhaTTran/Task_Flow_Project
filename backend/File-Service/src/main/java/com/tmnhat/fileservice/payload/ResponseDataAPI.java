package com.tmnhat.fileservice.payload;

public class ResponseDataAPI {
    private String status;
    private String message;
    private Object data;
    private Object meta;

    public ResponseDataAPI() {}

    public ResponseDataAPI(String status, String message, Object data, Object meta) {
        this.status = status;
        this.message = message;
        this.data = data;
        this.meta = meta;
    }

    public static ResponseDataAPI success(Object data, Object meta) {
        return new ResponseDataAPI("SUCCESS", "Operation completed successfully", data, meta);
    }

    public static ResponseDataAPI successWithoutMeta(Object data) {
        return new ResponseDataAPI("SUCCESS", "Operation completed successfully", data, null);
    }

    public static ResponseDataAPI successWithoutMetaAndData() {
        return new ResponseDataAPI("SUCCESS", "Operation completed successfully", null, null);
    }

    public static ResponseDataAPI error(String message) {
        return new ResponseDataAPI("ERROR", message, null, null);
    }

    // Getters and setters
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }

    public Object getMeta() { return meta; }
    public void setMeta(Object meta) { this.meta = meta; }
} 