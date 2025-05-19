async function m_Completepayment( FormOrJson, closeEvent ) { 
    const frm = document.createElement('form');
    frm.method = 'POST';
    frm.action = '/api/approve';
    frm.acceptCharset = 'EUC-KR';

     const requestApproveJson = {
        "res_cd" : "",
        "tran_cd" : "",
        "pay_method" : getPCPayMethod(),
        "enc_info" : "",
        "enc_data" : ""
    }
    appendHiddenInput(frm, requestApproveJson)
    document.body.appendChild(frm);

    GetField( frm, FormOrJson ); 
    closeEvent(); 

    if(frm.res_cd.value == "0000") { 
        frm.submit();
    } else {
        const responsePaymentWindowJson = {
            "res_cd" : FormOrJson.res_cd.value,
            "res_msg" : FormOrJson.res_msg.value
        }
        const responsePaymentWindowUrlQuery = new URLSearchParams(responsePaymentWindowJson).toString();
        window.location.href = `/KcpSendBox?${responsePaymentWindowUrlQuery}`;            
    }
}

async function registerPaymentPC() {
    const requestRegisterJson = {
        "good_mny" : document.querySelector('#goodPrice').value,
        "good_name" : document.querySelector('#goodName').value,
        "pay_method" : getPCPayMethod()
    }
    const responseRegisterPost = await fetch('/api/info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept-Charset': 'UTF-8'
        },
        body: JSON.stringify(requestRegisterJson)
    });
    const responseRegisterJson = await responseRegisterPost.json();
    const requestPaymentWindowJson = {
        "shop_name" : responseRegisterJson.shop_name,
        "currency" : responseRegisterJson.currency,
        "quotaopt" : responseRegisterJson.quotaopt,
        "site_cd" : responseRegisterJson.site_cd,
        "buyr_name" : responseRegisterJson.buyr_name,
        "buyr_tel2" : responseRegisterJson.buyr_tel2,
        "buyr_mail" : responseRegisterJson.buyr_mail,
        "ordr_idxx" : responseRegisterJson.ordr_idxx
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.acceptCharset = 'EUC-KR';

    appendHiddenInput(form, requestPaymentWindowJson);
    appendHiddenInput(form, requestRegisterJson);

    try {
        KCP_Pay_Execute_Web( form );
    } catch (e) {
    }
}

async function registerPaymentMobile() {
    const mobilePayMethod = getMobilePayMethod()
    const requestRegisterJson = {
        "good_mny" : document.querySelector('#goodPrice').value,
        "good_name" : document.querySelector('#goodName').value,
        "pay_method" : mobilePayMethod.payMethod
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

    if(responseRegisterJson.Code === "0000") {
        const requestPaymentWindowJson = {
            "shop_name" : responseRegisterJson.shop_name,
            "currency" : responseRegisterJson.currency,
            "quotaopt" : responseRegisterJson.quotaopt,
            "site_cd" : responseRegisterJson.site_cd,
            "Ret_URL" : responseRegisterJson.Ret_URL,
            "buyr_name" : responseRegisterJson.buyr_name,
            "buyr_tel2" : responseRegisterJson.buyr_tel2,
            "buyr_mail" : responseRegisterJson.buyr_mail,
            "ordr_idxx" : responseRegisterJson.ordr_idxx,
            "approval_key" : responseRegisterJson.approvalKey,
            "PayUrl" : responseRegisterJson.PayUrl,
            "van_code" : mobilePayMethod.vanCode
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = responseRegisterJson.PayUrl;
        form.acceptCharset = 'EUC-KR';

        appendHiddenInput(form, requestPaymentWindowJson);
        appendHiddenInput(form, requestRegisterJson);
        
        document.body.appendChild(form);
        form.submit();
    } else {
        const responseRegisterUrlQuery = new URLSearchParams(responseRegisterJson).toString();
        window.location.href = `/KcpSendBox?${responseRegisterUrlQuery}`;
    }
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