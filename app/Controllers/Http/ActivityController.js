'use strict'

const Database = use('Database')
const Drive = use('Drive')
const Helpers = use('Helpers')
const exec = use('child_process').exec
const moment = use('moment')

const Redis = use('Redis')
const {wxCF} = use('App/Helpers/config')
const {appid, secret} = wxCF()

const globalFn = use('App/Helpers/GlobalFn')
const got = use('got')
const axios = use('axios')
const fs = use('fs')

const activityTable = 'activity'
const userTable = 'users'
const joinTable = 'join_activity'
const photoTable = 'activity_photos'
const themeTable = 'themes'

class ActivityController {

  async newActivity({request, response}) {
    const query = request.post()
    const {userInfo: {unionid}} = request.post()
    const saveData = await globalFn.formatSubmitData(activityTable, {...query})
    saveData.created_at = new Date()
    saveData.updated_at = new Date()
    saveData.unionid = unionid

    const uid = await Database.select('unionid').from(userTable).where({unionid}).first()

    if (unionid && uid) {
      const actID = await Database.table(activityTable).insert(saveData)

      const {wx_access_token} = request.body
      //console.log(wx_access_token)
      let url = encodeURIComponent(`/JBL/activity/join/join?id=${actID}`)
      let postData = {
        path: `/JBL/index?share_query=${url}`,
        scene: "",
        width: 120,
        auto_color: false
      }

      let imgName = `${(new Date().getTime()).toString(32) + Math.random().toString(16).substr(2)}${actID}.jpg`
      // A 接口二维码
      // let save = await got.stream(`https://api.weixin.qq.com/wxa/getwxacode?access_token=${wx_access_token}`, {body: JSON.stringify(postData)}).pipe(fs.createWriteStream(Helpers.appRoot('upload/') + `${imgName}`));

      // B
      let save = await axios.post(`https://api.weixin.qq.com/wxa/getwxacode?access_token=${wx_access_token}`, {
        ...postData
      }, { responseType: 'stream' });
      save.data.pipe(fs.createWriteStream(Helpers.appRoot('upload/') + `${imgName}`));

      await Database.table(activityTable).update({ad_code: imgName}).where({id: actID})

      const exists = await Drive.exists(Helpers.appRoot('upload/') + `${imgName}`)

      await Database.table(joinTable).insert({activity_id: actID, form_id: query.formId, open_id: query.openId, unionid, created_at: new Date()})

      //活动开始前30分提醒
      let sendTime = moment(new Date(query.act_time).getTime()).subtract(30, 'minutes').format('HH:mm MM/DD/YYYY')
      await exec(`at ${sendTime} <<ENDMARKER \n curl https://oa.jiebeili.cn/wedemo/v0/remind/${actID} \n ENDMARKER`)
      //await exec(`at now + 1 minutes <<ENDMARKER \n curl https://oa.jiebeili.cn/wedemo/v0/remind/${actID} \n ENDMARKER`)

      //活动开始后一天时间自动关闭
      let closeTime = moment(new Date(query.act_time).getTime()).add(1, 'days').format('HH:mm MM/DD/YYYY')
      await exec(`at ${closeTime} <<ENDMARKER \n curl https://oa.jiebeili.cn/wedemo/v0/upateStatus/${actID} \n ENDMARKER`)

      //return response.status(200).json({id: actID})
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(response.status(200).json({id: actID}));
        }, 1300);
      })
    }

    return response.status(200).json({id: 0, message: '用户认证失败'})

  }

  async editActivity({request, response, params: {id}}) {
    const query = request.post()
    const {userInfo: {unionid}} = request.post()
    const saveData = await globalFn.formatSubmitData(activityTable, {...query})
    saveData.updated_at = new Date()

    const aid = await Database.from(activityTable).where({unionid, id}).update(saveData)
    if (aid) {
      return response.status(200).json({aid})
    } else {
      return response.status(200).json({error: 1, message: 'fail'})
    }
  }

  async getActivity({request, response, params: {id}}) {
    const actInfo = await Database.select('*').from(activityTable).where({id}).first()

    const {userInfo} = request.body
    const query = {activity_id: id, unionid: userInfo.unionid}
    //console.log(query)
    const joinId = await Database.table(joinTable).where(query).first()
    //console.log(joinId)
    let isJoin = 0
    if (joinId) {
      isJoin = 1
    }
    
    const count = await Database.from(joinTable).where({activity_id: id}).count()
    const join_count = count[0]['count(*)']

    const oldFiles = await Database.select('photo_url').from(photoTable).where({activity_id: id})

    return response.status(200).json({actInfo, isJoin, join_count, oldFiles})
  }

  async listActivity({request, response}) {

    const query = request.get()
    const page = query.page || 1
    const perPage = 10

    const activityData = await Database.select(activityTable + '.id', activityTable + '.unionid', activityTable + '.title', activityTable + '.ad_status', activityTable + '.act_type', activityTable + '.act_time', userTable + '.nickname').from(activityTable)
      .leftJoin(userTable, activityTable + '.unionid', userTable + '.unionid')
      .orderBy('id', 'desc')
      .paginate(page, perPage)

    return response.status(200).json({activityData})
  }

  async joinActivity({request, response}) {
    const {activity_id, form_id, open_id, userInfo: {unionid}} = request.post()
    const query = {activity_id, unionid, form_id, open_id}

    const isJoin = await Database.table(joinTable).where({activity_id, unionid}).first()
    query.created_at = new Date()

    if (isJoin) {
      return response.status(200).json({error: 1, message: '您已经参加该活动.'})
    } else {
      const joinId = await Database.from(joinTable).insert(query)
      return response.status(200).json({joinId})
    }

  }

  async checkJoin({request, response}) {
    const query = request.post()
    const joinId = await Database.table(joinTable).where(query).first()
    if (joinId) {
      return response.status(200).json({joinId})
    } else {
      return response.status(200).json({error: 0, message: '用户未参加该活动'})
    }
  }

  async getJoin({request, response, params: {id}}) {

    const {userInfo: {unionid}} = request.post()
    const query = request.get()
    const page = query.page || 1
    const perPage = 10
    const joinData = await Database.select(joinTable + '.*', userTable + '.avatarurl', userTable + '.nickname').from(joinTable)
      .leftJoin(userTable, joinTable + '.unionid', userTable + '.unionid')
      .where('activity_id', id)
      .orderBy('id', 'asc')
      .paginate(page, perPage)

    const count = await Database.from(joinTable).where({activity_id: id, is_join: 1}).count()
    const join_count = count[0]['count(*)']

    const activityInfo = await Database.select('*').from(activityTable).where({id}).first()

    const oldFiles = await Database.select('photo_url').from(photoTable).where({activity_id: id, unionid})
    
    const isJoin = await Database.table(joinTable).where({activity_id:id, unionid}).first()
    let is_join = isJoin ? true : false

    return response.status(200).json({joinData, join_count, activityInfo, oldFiles, isJoin: is_join})
  }

  async getTheme({request, response}) {
    let themeInfo = await Database.select('*').table(themeTable)
    return response.status(200).json({themeInfo})
  }

  async changeActStatus({request, response}) {

    const {id, ad_status, userInfo: {unionid}} = request.post()
    const activityId = await Database.from(activityTable).where({id, unionid}).update({ad_status})

    if (activityId) {
      return response.status(200).json({ad_status})
    } else {
      return response.status(200).json({error: 0, message: '操作失败'})
    }

  }

  async uploadFile({request, response}) {
    //console.log(request)

    const {activity_id, userInfo: {unionid}} = request.post()

    if (unionid) {
      const ThumbInfo = await globalFn.uploadPic(request, 'thumb_img', {upSize: 5})
      //console.log(ThumbInfo)
      let imgMsg = ''
      let picName = ''
      if (ThumbInfo && ThumbInfo.status == 'error') {
        imgMsg += `Error: ${JSON.stringify(ThumbInfo.error)}`

        return response.status(200).json({error: 1, message: imgMsg})
      }
      if (ThumbInfo && ThumbInfo.status == 'moved') {
        picName = ThumbInfo.fileName
        imgMsg += 'ok'

        const joinId = await Database.from(photoTable).insert({activity_id, unionid, photo_url: picName, created_at: new Date()})

        return response.status(200).json({picName, message: imgMsg})
      }

      return response.status(200).json({error: 1, message: 'error'})

    } else {
      return response.status(200).json({error: 1, message: 'fail'})
    }
  }

  async signActivity({request, response}) {
    const {id, activity_id, is_join, userInfo: {unionid}} = request.post()
    const actId = await Database.table(activityTable).where({id: activity_id, unionid}).first()

    if (actId) {
      const joinId = await Database.from(joinTable).where({activity_id, id}).update({is_join, updated_at: new Date()})
      if (joinId) {
        return response.status(200).json({check: true, is_join})
      } else {
        return response.status(200).json({error: 1, is_join, message: 'fail'})
      }
    } else {
      return response.status(200).json({error: 1, is_join, message: 'fail'})
    }
  }

  async getGlory({request, response}) {
    const query = request.all()
    const page = query.page || 1
    const type = query.type || 0
    const perPage = 10
    
    const count = await Database.from(userTable)
    		.leftJoin(joinTable, userTable + '.unionid', joinTable + '.unionid')
        .where({'is_join': 1})
        .count()

    if (type == 0) {
      const glory = await Database.select(userTable + '.nickname', userTable + '.avatarurl')
        .count(joinTable + '.unionid as number').from(joinTable)
        .leftJoin(activityTable, joinTable + '.activity_id', activityTable + '.id')
        .where({'ad_status': 2})
        .leftJoin(userTable, joinTable + '.unionid', userTable + '.unionid')
        .where({'is_join': 1})
        .orderBy('number', 'desc')
        .groupBy(joinTable + '.unionid')
        .paginate(page, perPage)
        
      glory.total = count[0]['count(*)']
      glory.lastPage = Math.ceil(count[0]['count(*)']/perPage)

      return response.status(200).json({glory})
    } else {
      const typeId = await Database.select('id').from(activityTable).where('act_type', type)
      const findId = typeId.map(item => {
        return item.id
      })
      const glory = await Database.select(userTable + '.nickname', userTable + '.avatarurl')
        .count(joinTable + '.unionid as number').from(joinTable)
        .leftJoin(activityTable, joinTable + '.activity_id', activityTable + '.id')
        .where({'ad_status': 2})
        .leftJoin(userTable, joinTable + '.unionid', userTable + '.unionid')
        .where({'is_join': 1})
        .whereIn('activity_id', findId)
        .orderBy('number', 'desc')
        .groupBy(joinTable + '.unionid')
        .paginate(page, perPage)
        
        glory.total = count[0]['count(*)']
      	glory.lastPage = Math.ceil(count[0]['count(*)']/perPage)

      return response.status(200).json({glory})
    }

  }

  async destroyPhoto({request, response}) {
    const {activity_id, photo_url, userInfo: {unionid}} = request.post()
    const actId = await Database.table(activityTable).where({id: activity_id, unionid}).first()

    if (actId) {
      const joinId = await Database.from(photoTable).where({activity_id, photo_url}).del()

      if (joinId) {

        const oldPic = Helpers.appRoot('uploads/') + photo_url
        const exists = Drive.exists(oldPic)
        if (exists) {
          Drive.delete(oldPic)
        }

        return response.status(200).json({joinId})

      } else {
        return response.status(200).json({error: 1})
      }

    } else {
      return response.status(200).json({error: 1, message: 'fail'})
    }
  }

  async myActivity({request, response}) {

    const {userInfo: {unionid}} = request.post()
    if (unionid) {
      const query = request.get()
      const page = query.page || 1
      const perPage = 10

      const activityData = await Database.select(activityTable + '.id', activityTable + '.unionid', activityTable + '.title', activityTable + '.ad_status', activityTable + '.act_type', activityTable + '.act_time', userTable + '.nickname')
        .from(activityTable)
        .leftJoin(userTable, activityTable + '.unionid', userTable + '.unionid')
        .where(activityTable + '.ad_status', 2)
        .leftJoin(joinTable, activityTable + '.id', joinTable + '.activity_id')
        .where(joinTable + '.is_join', 1)
        .where(joinTable + '.unionid', unionid)
        .orderBy(activityTable + '.id', 'desc')
        .paginate(page, perPage)

      return response.status(200).json({activityData})
    } else {
      return response.status(200).json({error: 1, message: 'fail'})
    }

  }

  async upateStatus({request, response, params: {id}}) {
    //console.log(id)
    //await Database.raw(`update activity set ad_status=2 where  act_time  < (NOW() - interval 24 hour)`)
    await Database.table(activityTable).update({ad_status: 2}).where({id})
  }

  async remind({request, response, params: {id}}) {

    const actInfo = await Database.select('title', 'act_time', 'address', 'address_name').from(activityTable).where({id}).whereIn('ad_status', [0, 1]).first()
    if (actInfo) {
      const userJobInfo = await Database.select('id', 'activity_id', 'form_id', 'open_id').from(joinTable).where({activity_id: id})

      let address = actInfo.address_name == '' ? actInfo.address : actInfo.address_name
      let stime = moment(new Date(actInfo.act_time).getTime()).format('YYYY-MM-DD HH:mm')

      let sendData = {
        "keyword1": {
          "value": actInfo.title
        },
        "keyword2": {
          "value": stime.toString()
        },
        "keyword3": {
          "value": address
        },
        "keyword4": {
          "value": "30分钟后开始了"
        }
      }

      let cachedUsers = await Redis.get('wx_access_token')
      if (!cachedUsers) {
        let wxCode = await got.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`, {})
        let codeKey = JSON.parse(wxCode.body).access_token

        await Redis.set('wx_access_token', codeKey, 'EX', 7000)
        cachedUsers = codeKey
      }
      //console.log(cachedUsers)
      let url = encodeURIComponent(`/JBL/activity/join/join?id=${id}`)
      let postData = {}

      userJobInfo.forEach(item => {
        postData = {
          "touser": item.open_id,
          "template_id": "vWQlhv_r75qIpD17tueANUkc8t3OE6LomqasWgBf-BU",
          "page": `JBL/index?share_query=${url}`,
          "form_id": item.form_id,
          "data": sendData
        }

        got.post(`https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=${cachedUsers}`, {body: JSON.stringify(postData)})

      })

      return response.status(200).json({message: 'OK'})
    }

  }

  async test({request, response}) {
    //  await exec('at now + 1 minutes <<ENDMARKER \n curl http://127.0.0.1/wedemo/remind/1 \n ENDMARKER', function (error, stdout, stderr) {
    //   if(error) {
    //     console.log('get weather api error:'+stderr);
    //   } else {
    //      //console.log(stdout)
    //   }
    // })
    //return response.status(200).json({ls})

    let stime = moment(new Date('2018-07-09 17:00:00').getTime()).format('YYYY-MM-DD HH:mm')
    console.log(stime)
    return response.status(200).json({stime})
  }

}

module.exports = ActivityController
