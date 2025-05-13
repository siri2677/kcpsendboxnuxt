async function registerPayment() {
    const requestRegister = {
        "good_mny" : document.querySelector('#goodPrice').value,
        "good_name" : document.querySelector('#goodName').value,
        "pay_method" : document.querySelector('#payMethod').value
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept-Charset': 'UTF-8'
            },
            body: JSON.stringify(requestRegister)
        });

        const data = await res.json();
        // const qs = new URLSearchParams(data).toString();
        // window.location.href = `/KcpHtmlLiveEditorMobile?${qs}`;

        if(data.Code === "0000") {
            alert('API 호출 성공:' + data.PayUrl + data.Ret_URL)

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.PayUrl;
            form.acceptCharset = 'EUC-KR';

            Object.entries(data).forEach(([key, value]) => {
                appendHiddenInput(form, key, value);
            });

            Object.entries(requestRegister).forEach(([key, value]) => {
                appendHiddenInput(form, key, value);
            });
        
            document.body.appendChild(form);
            form.submit();
        } else {

        }

        // window.parent.postMessage({ type: 'kcp-result', payload: data }, '*');
    } catch (err) {
        console.error('API 호출 실패:', err.message);
    }
}

function appendHiddenInput(form, name, value) {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = name;
    input.value = value;
    form.appendChild(input);
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