import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    vus: 5,         // Giả lập 5 user ảo đồng thời
    duration: '10s', // Chạy thử trong 10 giây
};

export default function () {
    // API Endpoint tạo session thanh toán
    const url = 'http://localhost:8081/api/v1/checkout/sessions'; 
    
    const payload = JSON.stringify({
        orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        amount: 150000.00,
        currency: 'VND',
        merchantId: 5,
        paymentMethod: 'PAYGATE',
        description: 'Load test session created by k6'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let res = http.post(url, payload, params);

    // Kiểm tra kết quả trả về
    check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'has checkout token': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.token !== undefined;
            } catch (e) {
                return false;
            }
        }
    });

    sleep(1); // Nghỉ 1 giây giữa các lần gửi request
}
