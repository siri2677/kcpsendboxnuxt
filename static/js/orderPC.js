function jsf__pay(f) { 
    try { 
        KCP_Pay_Execute_Web(f); 
    } catch(e) { 
        console.error(e); 
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