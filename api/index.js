const express = require('express')
const bodyParser = require('body-parser')

const axios = require('axios') 
const { stringify } = require('querystring')
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 메모리 상의 샘플 데이터
let products = [
  { id: 1, name: 'Product A', price: 100 },
  { id: 2, name: 'Product B', price: 200 }
]

function init_orderid() { 
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

// GET /api/products
app.post('/product', async (req, res) => {
  alert("test");
  console.log("test");
  console.log(req);
  res.json(products)

  const url = new URL('/KcpHtmlLiveEditorMobile');
  // 모든 키·값을 searchParams에 자동 추가
  Object.entries(req.body).forEach(([key, val]) => {
    url.searchParams.append(key, val);
  });
  return res.redirect(302, url.toString());
})

app.post('/submit-form', (req, res) => {

  // req.body가 { a:1, b:2 }라면 "a=1&b=2"
  console.log("테스트")
  console.log(req.body)
  const params = stringify(req.body)

  // 상대경로로 리다이렉트
  return res.redirect(302, `/KcpHtmlLiveEditorMobile?${params}`)

  // const data = req.body
  // // 서버 템플릿(예: Pug, EJS)에 data를 넘겨 렌더링
  // return res.render('KcpHtmlLiveEditorMobile', { initData: JSON.stringify(data) })
})

app.post('/register', async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.site_cd = "T0000";
    payload.kcp_cert_info = "-----BEGIN CERTIFICATE-----MIIDgTCCAmmgAwIBAgIHBy4lYNG7ojANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJLUjEOMAwGA1UECAwFU2VvdWwxEDAOBgNVBAcMB0d1cm8tZ3UxFTATBgNVBAoMDE5ITktDUCBDb3JwLjETMBEGA1UECwwKSVQgQ2VudGVyLjEWMBQGA1UEAwwNc3BsLmtjcC5jby5rcjAeFw0yMTA2MjkwMDM0MzdaFw0yNjA2MjgwMDM0MzdaMHAxCzAJBgNVBAYTAktSMQ4wDAYDVQQIDAVTZW91bDEQMA4GA1UEBwwHR3Vyby1ndTERMA8GA1UECgwITG9jYWxXZWIxETAPBgNVBAsMCERFVlBHV0VCMRkwFwYDVQQDDBAyMDIxMDYyOTEwMDAwMDI0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAppkVQkU4SwNTYbIUaNDVhu2w1uvG4qip0U7h9n90cLfKymIRKDiebLhLIVFctuhTmgY7tkE7yQTNkD+jXHYufQ/qj06ukwf1BtqUVru9mqa7ysU298B6l9v0Fv8h3ztTYvfHEBmpB6AoZDBChMEua7Or/L3C2vYtU/6lWLjBT1xwXVLvNN/7XpQokuWq0rnjSRThcXrDpWMbqYYUt/CL7YHosfBazAXLoN5JvTd1O9C3FPxLxwcIAI9H8SbWIQKhap7JeA/IUP1Vk4K/o3Yiytl6Aqh3U1egHfEdWNqwpaiHPuM/jsDkVzuS9FV4RCdcBEsRPnAWHz10w8CX7e7zdwIDAQABox0wGzAOBgNVHQ8BAf8EBAMCB4AwCQYDVR0TBAIwADANBgkqhkiG9w0BAQsFAAOCAQEAg9lYy+dM/8Dnz4COc+XIjEwr4FeC9ExnWaaxH6GlWjJbB94O2L26arrjT2hGl9jUzwd+BdvTGdNCpEjOz3KEq8yJhcu5mFxMskLnHNo1lg5qtydIID6eSgew3vm6d7b3O6pYd+NHdHQsuMw5S5z1m+0TbBQkb6A9RKE1md5/Yw+NymDy+c4NaKsbxepw+HtSOnma/R7TErQ/8qVioIthEpwbqyjgIoGzgOdEFsF9mfkt/5k6rR0WX8xzcro5XSB3T+oecMS54j0+nHyoS96/llRLqFDBUfWn5Cay7pJNWXCnw4jIiBsTBa3q95RVRyMEcDgPwugMXPXGBwNoMOOpuQ==-----END CERTIFICATE-----";
    payload.Ret_URL = "http://localhost:3000/api/submit-form";
    payload.user_agent = "";
    payload.ordr_idxx = init_orderid();

    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, val]) => {
      params.append(key, val);
    });

    // 외부 API 호출
    const response = await axios.post(
      'https://stg-spl.kcp.co.kr/std/tradeReg/register',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept-Charset': 'UTF-8'
        }
      }
    );

    // 응답 데이터 복사
    const result = { ...response.data };
    if(result.Code === "0000") {
      result.shop_name = "TEST SITE";
      result.approval_key = result.approvalKey;
      result.currency = "410"
      result.quotaopt = "12";
      result.site_cd = "T0000";
      result.Ret_URL = "http://localhost:3000/api/submit-form";
      result.buyr_name = "홍길동";
      result.buyr_tel2 = "010-0000-0000";
      result.buyr_mail = "test@test.co.kr";
      result.ordr_idxx = payload.ordr_idxx;
    } 

    return res.json(result);
  } catch (err) {
    console.error('API 호출 실패:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
app.get('/products/:id', (req, res) => {
  const p = products.find(x => x.id === +req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

// POST /api/products
app.post('/products', (req, res) => {
  const { name, price } = req.body
  if (!name || price == null) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const id = products.length ? products[products.length-1].id + 1 : 1
  const newProduct = { id, name, price }
  products.push(newProduct)
  res.status(201).json(newProduct)
})

// PUT /api/products/:id
app.put('/products/:id', (req, res) => {
  const idx = products.findIndex(x => x.id === +req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const { name, price } = req.body
  products[idx] = { ...products[idx], name, price }
  res.json(products[idx])
})

// DELETE /api/products/:id
app.delete('/products/:id', (req, res) => {
  const idx = products.findIndex(x => x.id === +req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const deleted = products.splice(idx, 1)[0]
  res.json(deleted)
})

module.exports = app