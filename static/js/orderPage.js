async function requestPaymentPC() {
    const requestStoreJson = {
        "site_cd": "T0000",
        "good_mny": "1004",
        "good_name": "운동화",
        "ordr_idxx": getOrderId()
    }

    await fetch('/api/store', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify(requestStoreJson)
    });

    const requestPaymentWindowJson = {
        ...requestStoreJson,
        "shop_name": "TEST SITE",
        "currency": "410",
        "quotaopt": "12",
        "pay_method": getPCPayMethod(),
        "buyr_name": "홍길동",
        "buyr_tel2": "010-0000-0000",
        "buyr_mail": ""
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.acceptCharset = 'EUC-KR';

    appendHiddenInput(form, requestPaymentWindowJson);

    try {
        KCP_Pay_Execute_Web( form );
    } catch (e) {
    }
}

async function requestPaymentMobile() {
    const mobilePayMethod = getMobilePayMethod()
    const requestRegisterJson = {
        "site_cd": "T0000",
        "Ret_URL": "http://localhost:3000/api/approve",
        "good_mny": "1004",
        "good_name": "운동화",
        "pay_method": mobilePayMethod.payMethod,
        "ordr_idxx": getOrderId()
    }
    
    const responseRegisterPost = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify(requestRegisterJson)
    });
    const responseRegisterJson = await responseRegisterPost.json();

    if(responseRegisterPost.status === 200 && responseRegisterJson.Code === "0000") {
        openConfirm('결제 창을 띄우시겠습니까?', () => {
            const requestPaymentWindowJson = {
                ...requestRegisterJson,
                "shop_name": "TEST SITE",
                "currency": "410",
                "quotaopt": "12",
                "buyr_name": "홍길동",
                "buyr_tel2": "010-0000-0000",
                "buyr_mail": "",
                "van_code" : mobilePayMethod.vanCode,
                "approval_key" : responseRegisterJson.approvalKey,
                "PayUrl" : responseRegisterJson.PayUrl,
            }

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = responseRegisterJson.PayUrl;
            form.acceptCharset = 'EUC-KR';

            appendHiddenInput(form, requestPaymentWindowJson);

            document.body.appendChild(form);
            form.submit();
        })
    }
}

async function m_Completepayment( FormOrJson, closeEvent ) {
    closeEvent(); 
    const frm = document.createElement('form');
    frm.method = 'POST';
    frm.action = '/api/approve';
    frm.acceptCharset = 'EUC-KR';

    const requestApproveJson = {
        "res_cd" : "",
        "res_msg" : "",
        "tran_cd" : "",
        "pay_method" : getPCPayMethod(),
        "enc_info" : "",
        "enc_data" : ""
    }

    appendHiddenInput(frm, requestApproveJson)
    document.body.appendChild(frm);

    GetField( frm, FormOrJson );
    frm.submit();
}

function getOrderId() { 
  const now = new Date();
  const pad = num => String(num).padStart(2, '0');
  const year   = now.getFullYear();
  const month  = pad(now.getMonth() + 1);
  const day    = pad(now.getDate());
  const hour   = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());
  return `TEST${year}${month}${day}${hour}${minute}${second}`;
}

function getPCPayMethod() {
    const payMethodId = document.querySelector('#payMethod');
    const payMethodIdSelectedOption = payMethodId.selectedOptions[0];

    switch(payMethodIdSelectedOption.textContent) {
        case "신용카드" : return "100000000000"
        case "가상계좌" : return "001000000000"
        case "계좌이체" : return "010000000000"
        case "휴대폰" : return "000010000000"
        case "OK캐쉬백" : return "000100000000"
        case "복지포인트" : return "000100000000"
        case "도서상품권" : return "000000001000"
        case "문화상품권" : return "000000001000"
        case "해피머니" : return "000000001000"
    }
}

function getMobilePayMethod() {
    const payMethodId = document.querySelector('#payMethod');
    const payMethodIdSelectedOption = payMethodId.selectedOptions[0];

    switch(payMethodIdSelectedOption.textContent) {
        case "신용카드" : return { "payMethod" : "CARD",  "vanCode" : "" }
        case "가상계좌" : return { "payMethod" : "VCNT",  "vanCode" : "" }
        case "계좌이체" : return { "payMethod" : "BANK",  "vanCode" : "" }
        case "휴대폰" : return { "payMethod" : "MOBX",  "vanCode" : "" }
        case "OK캐쉬백" : return { "payMethod" : "TPNT",  "vanCode" : "SCSK" }
        case "복지포인트" : return { "payMethod" : "TPNT",  "vanCode" : "SCWB" }
        case "도서상품권" : return { "payMethod" : "GIFT",  "vanCode" : "SCBL" }
        case "문화상품권" : return { "payMethod" : "GIFT",  "vanCode" : "SCCL" }
        case "해피머니" : return { "payMethod" : "GIFT",  "vanCode" : "SCHM" }
    }
}

function appendHiddenInput(form, json) {
    Object.entries(json).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = key;
        input.value = value;
        form.appendChild(input);
    });
}

function openConfirm(message, onYes) {
    const overlay = document.getElementById('custom-confirm-overlay');
    const yesBtn  = document.getElementById('custom-confirm-yes');
    const noBtn   = document.getElementById('custom-confirm-no');
    const bodyEl  = document.getElementById('custom-confirm-body');
    // 1) 메시지 설정 및 오버레이 표시
    bodyEl.textContent = message;
    overlay.style.display = 'block';
    
    // 2) 클릭 핸들러 정의
    const handleYes = () => {
      overlay.style.display = 'none';
      onYes();            // 전달된 콜백 실행
      cleanUp();
    };
    const handleNo = () => {
      overlay.style.display = 'none';
      cleanUp();
    };
  
    // 3) 이벤트 등록
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  
    // 4) 후처리: 이벤트 제거
    function cleanUp() {
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
    }
}