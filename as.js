const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const doc = require('html-docx-js-typescript');
const fs = require('fs-extra');

const cookie = 'SINAGLOBAL=6359618123840.343.1552439856109; SSOLoginState=1606814486; SCF=AlRTDAolEeBb6gj-cR4aaY5rbkXRh8QC1qld7AOaSVKv7rRQNgh48m9NA2CQmOcg5lxn3zSe8BASi19dEI_YopU.; SUB=_2A25ywntHDeRhGeBK41MT8izKyTqIHXVRtuuPrDV8PUJbmtANLWnhkW9NR5G66xjoEnxCSFbl702wu0Uw-0Au42W_; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WW4g-yLZ_qHNx3bq303_O4G5JpX5KzhUgL.FoqX1h2Eeozceoq2dJLoI7DRIg8aTgz_wsLy; __guid=15428400.2185817518589138200.1606814488192.0203; _s_tentry=login.sina.com.cn; UOR=club.huawei.com,widget.weibo.com,login.sina.com.cn; Apache=5137162925892.655.1606814489846; ULV=1606814489918:428:1:1:5137162925892.655.1606814489846:1599553128907; wvr=6; wb_view_log_6481222626=1440*9601.5749999284744263; monitor_count=5; webim_unReadCount=%7B%22time%22%3A1606814603842%2C%22dm_pub_total%22%3A0%2C%22chat_group_client%22%3A0%2C%22chat_group_notice%22%3A2%2C%22allcountNum%22%3A17%2C%22msgbox%22%3A0%7D'

const userList = [
  {
    uid: '6106031800',
    idl: '1005056106031800',
    name: '菊厂刘掌柜'
  }
]

const contentList = []
const hasRaw = fs.readJsonSync('./res/has.json')
const hasList = [
  ...hasRaw
]

function Trim(str) {
  return str.replace(/(^\s*)|(\s*$)/g, "");
}

function queryUserBlog(user, query) {
  const qStr = qs.stringify({
    ajwvr: 6,
    domain: 100505,
    is_all: 1,
    pl_name: 'Pl_Official_MyProfileFeed__20',
    id: user.idl,
    script_uri: `/u/${user.uid}`,
    feed_type: 0,
    domain_op: 100505,
    ...query,
    __rnd: (new Date()).getTime(),
  })
  return axios({
    method: 'get',
    url: `https://weibo.com/p/aj/v6/mblog/mbloglist?${qStr}`,
    headers: {
      referer: `https://weibo.com/u/${user.uid}?is_all=1`,
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookie
    }
  }).then((res) => {
    const $ = cheerio.load(res.data.data);
    const cardList = $('.WB_cardwrap')
    const opList = []
    cardList.each(function () {
      const mid = $(this).attr('mid');
      if (mid) {
        let st = $(this).find('.WB_detail .WB_text.W_f14').text()
        st = Trim(st)
        // 字数有要求
        if (st.length > 120 && hasList.indexOf(mid) === -1) {
          opList.push(
            queryBlogDetail(user, mid)
          )
        }
      }
    })
    return Promise.all(opList)
  })
}

function queryBlogDetail(user, mid) {
  const qStr = qs.stringify({
    ajwvr: 6,
    mid: mid,
    is_settop: '',
    is_sethot: '',
    is_setfanstop: '',
    is_setyoudao: '',
    is_from_ad: 0,
    __rnd: (new Date()).getTime(),
  })
  return axios({
    method: 'get',
    url: `https://weibo.com/p/aj/mblog/getlongtext?${qStr}`,
    headers: {
      referer: `https://weibo.com/u/${user.uid}?is_all=1`,
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookie
    }
  }).then((res) => {
    hasList.push(mid)
    contentList.push(res.data.data)
  })
}


function logData(fileData) {
  const fileName = './res/book.docx';
  return fs.ensureFile(fileName).then(() => {
    return fs.outputFile(fileName, fileData)
  });
}

function logHas(list) {
  const fileName = './res/has.json';
  return fs.ensureFile(fileName).then(() => {
    return fs.writeJson(fileName, list, {spaces: 2})
  });
}

let qList = []
userList.forEach(async (user)=>{
  qList.push(queryUserBlog(user, {
    pagebar: 0
  }))
  qList.push(queryUserBlog(user, {
    pagebar: 0,
    page: 1,
    pre_page: 1,
  }))
  qList.push(queryUserBlog(user, {
    pagebar: 1,
    page: 1,
    pre_page: 1,
  }))
  // qList.push(queryUserBlog(user, {
  //   pagebar: 0,
  //   page: 2,
  //   pre_page: 1,
  // }))
  // qList.push(queryUserBlog(user, {
  //   pagebar: 0,
  //   page: 2,
  //   pre_page: 2,
  // }))
  // qList.push(queryUserBlog(user, {
  //   pagebar: 1,
  //   page: 2,
  //   pre_page: 2,
  // }))
})

Promise.all(qList).then(()=>{
  let html = ''
  console.log(contentList.length)
  if (contentList.length > 0) {
    contentList.forEach((h)=>{
      html += `<p>${h.html}</p><br/><br/><br/><br/>`
    })
    doc.asBlob(html).then((buffer) => {
      logData(buffer)
    })
    logHas(hasList)
  }
})

