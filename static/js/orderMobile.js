async function registerPayment(form) {
    const formData = new FormData(form);
    const requestRegister = {
        "ordr_idxx" : formData.get('ordr_idxx'),
        "good_mny" : formData.get('good_mny'),
        "good_name" : formData.get('good_name'),
        "pay_method" : formData.get('pay_method'),
        "Ret_URL" : formData.get('Ret_URL'),
        "escw_used" : formData.get('escw_used'),
    }

    try {
        // 3) fetch로 POST 요청 (JSON)
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestRegister)
        });
        const data = await res.json();
        // const qs = new URLSearchParams(data).toString();
        // window.location.href = `/KcpHtmlLiveEditorMobile?${qs}`;
        alert('API 호출 성공:' + data.PayUrl)

        // 3. POST 전송을 위한 form 동적 생성
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.PayUrl;

        // 숨겨진 input 추가
        const inputToken = document.createElement('input');
        inputToken.type = 'hidden';
        inputToken.name = 'token';
        inputToken.value = data;

        const inputStatus = document.createElement('input');
        inputStatus.type = 'hidden';
        inputStatus.name = 'PayUrl';
        inputStatus.value = data.PayUrl;

        form.appendChild(inputToken);
        form.appendChild(inputStatus);

        document.body.appendChild(form);
        form.submit();
        
        console.error('API 호출 성공:', data1);

        // window.parent.postMessage({ type: 'kcp-result', payload: data }, '*');
    } catch (err) {
        console.error('API 호출 실패:', err.message);
    }
}

function jsf__chk_type() {
    if ( document.orderInfo.payMethod.value == "card" ) 
    {
        document.orderInfo.pay_method.value = "CARD";
    }
    else if ( document.orderInfo.payMethod.value == "acnt" )
    {
        document.orderInfo.pay_method.value = "BANK";
    }
    else if ( document.orderInfo.payMethod.value == "vcnt" )
    {
        document.orderInfo.pay_method.value = "VCNT";
    }
    else if ( document.orderInfo.payMethod.value == "mobx" )
    {
        document.orderInfo.pay_method.value = "MOBX";
    }
    else if ( document.orderInfo.payMethod.value == "ocb" )
    {
        document.orderInfo.pay_method.value = "TPNT";
        document.orderInfo.van_code.value = "SCSK";
    }
    else if ( document.orderInfo.payMethod.value == "tpnt" )
    {
        document.orderInfo.pay_method.value = "TPNT";
        document.orderInfo.van_code.value = "SCWB";
    }
    else if ( document.orderInfo.payMethod.value == "scbl" )
    {
        document.orderInfo.pay_method.value = "GIFT";
        document.orderInfo.van_code.value = "SCBL";
    }
    else if ( document.orderInfo.payMethod.value == "sccl" )
    {
        document.orderInfo.pay_method.value = "GIFT";
        document.orderInfo.van_code.value = "SCCL";
    }
    else if ( document.orderInfo.payMethod.value == "schm" )
    {
        document.orderInfo.pay_method.value = "GIFT";
        document.orderInfo.van_code.value = "SCHM";
    }
}

function init_orderid() { 
    try { 
        const d = new Date(), 
        y = d.getFullYear(), 
        m = ('0'+(d.getMonth()+1)).slice(-2), 
        dt = ('0'+d.getDate()).slice(-2), 
        t = d.getTime(); 
        
        const form=document.forms[0]; 
        
        if (form && form.ordr_idxx) form.ordr_idxx.value = 'TEST'+y+m+dt+t; 
    } catch(e) { 
        console.error(e); 
    } 
}

init_orderid();