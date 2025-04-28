import axios from "axios"

const axiosInstance = axios.create({
    baseURL: "http://localhost:8080/api",  // Đổi thành base URL backend của bạn
    headers: {
        "Content-Type": "application/json",
    },
})

export default axiosInstance
