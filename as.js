const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const doc = require('html-docx-js-typescript');
const fs = require('fs-extra');
const moment = require('moment');

const cookie = 'SINAGLOBAL=6359618123840.343.1552439856109; __guid=15428400.2185817518589138200.1606814488192.0203; UOR=club.huawei.com,widget.weibo.com,login.sina.com.cn; wvr=6; SSOLoginState=1606872757; _s_tentry=weibo.com; Apache=7461508594750.188.1606872776374; wb_view_log_6481222626=1440*9601.5749999284744263; ULV=1606872776398:429:2:2:7461508594750.188.1606872776374:1606814489918; SCF=AlRTDAolEeBb6gj-cR4aaY5rbkXRh8QC1qld7AOaSVKvytG8n1FiveZFQ_Yr5vPwlgrNe5T_F0eN14dtRx3Nx2o.; SUB=_2A25yw0LhDeRhGeBK41MT8izKyTqIHXVRuTMprDV8PUJbmtAKLUOlkW9NR5G66wiZ1JhT0D9LlpoeXHwgmPIq2__L; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WW4g-yLZ_qHNx3bq303_O4G5JpX5KzhUgL.FoqX1h2Eeozceoq2dJLoI7DRIg8aTgz_wsLy; WBStorage=8daec78e6a891122|undefined; webim_unReadCount=%7B%22time%22%3A1606890267962%2C%22dm_pub_total%22%3A0%2C%22chat_group_client%22%3A0%2C%22chat_group_notice%22%3A2%2C%22allcountNum%22%3A18%2C%22msgbox%22%3A0%7D; monitor_count=30'

const userList = [
  {
    uid: '6106031800',
    idl: '1005056106031800',
    name: '菊厂刘掌柜'
  },
  {
    uid: '6169408204',
    idl: '1005056169408204',
    name: '风中的厂长'
  },
  {
    uid: '2611641261',
    idl: '1005052611641261',
    name: '红茶家的三叔'
  },
  {
    uid: '3224580794',
    idl: '1005053224580794',
    name: '_村西边老王_'
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
        if (hasList.indexOf(mid) !== -1) {
          console.log(mid)
        }
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
  const fileName = `./res/${moment().format('YYYY-MM-DD')}微博.docx`;
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
userList.forEach(async (user) => {
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

Promise.all(qList).then(() => {
  let html = ''
  console.log(contentList.length)
  if (contentList.length > 0) {
    contentList.forEach((h) => {
      let str = h.html
      str = str.replace(/<\s?img[^>]*>/gi, '');
      html += `<p>${str}</p><br/><br/><br/><br/>`
    })
    doc.asBlob(html).then((buffer) => {
      logData(buffer)
    })
    logHas(hasList)
  }
})

