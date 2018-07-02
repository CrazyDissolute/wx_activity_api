'use strict'

const Database = use('Database')
const Drive = use('Drive')
const Helpers = use('Helpers')

const globalFn = use('App/Helpers/GlobalFn')
const got = use('got')
const fs = use('fs')

const activityTable = 'activity'
const userTable = 'users'
const joinTable = 'join_activity'
const photoTable = 'activity_photos'

class ActivityController {

	async newActivity({request, response, auth}){

		const saveData = await globalFn.formatSubmitData(activityTable, request.post())
		saveData.created_at = new Date()
		saveData.updated_at = new Date()

		const uid = await Database.select('unionid').from(userTable).where('unionid', saveData.unionid).first()

		if(saveData.unionid && uid){
			const actID = await Database.table(activityTable).insert(saveData)

			const { wx_access_token } = request.body
			//console.log(wx_access_token)

			let postData = {
				path: "JBL/activity/join/join?id="+actID,
				scene: "",
				width: 120,
				auto_color: false
			}

			let imgName = `${(new Date().getTime()).toString(32)+Math.random().toString(16).substr(2)}${actID}.jpg`
			let save = await got.stream(`https://api.weixin.qq.com/wxa/getwxacode?access_token=${wx_access_token}`,{body: JSON.stringify(postData)}).pipe(fs.createWriteStream(Helpers.appRoot('upload/')+`${imgName}`))

			await Database.table(activityTable).update({ad_code: imgName}).where({id: actID})

			const exists = await Drive.exists(Helpers.appRoot('upload/') + `${imgName}`)

      await Database.table(joinTable).insert({activity_id: actID, unionid: saveData.unionid, created_at: new Date()})

			return response.status(200).json({id: actID})
		}

		return response.status(200).json({id: 0, message: '用户认证失败'})

	}

	async getActivity({request, response, params: {id}}){
		const actInfo =  await Database.select('*').from(activityTable).where({id}).first()

    const { userInfo } = request.body
    const query = {activity_id:id, unionid: userInfo.unionid}
    //console.log(query)
    const joinId = await Database.table(joinTable).where(query).first()
    //console.log(joinId)
    let isJoin = 0
    if(joinId){
      isJoin = 1
    }

    const oldFiles = await Database.select('photo_url').from(photoTable).where({activity_id: id})

		return response.status(200).json({actInfo, isJoin, oldFiles})
	}

	async listActivity({request, response}){

		const query = request.get()
    const page = query.page || 1
    const perPage = 10

    const activityData = await Database.select(activityTable+'.id', activityTable+'.unionid', activityTable+'.title', activityTable+'.act_type', activityTable+'.act_time', userTable+'.nickname').from(activityTable)
      .leftJoin(userTable, activityTable+'.unionid', userTable+'.unionid')
      .orderBy('id', 'desc')
      .paginate(page, perPage)

		return response.status(200).json({activityData})
	}

	async joinActivity({request, response}){
		const { activity_id, userInfo: { unionid } } = request.post()
    //const { userInfo: { unionid } } = request.body
    const query = { activity_id, unionid }

		const isJoin = await Database.table(joinTable).where(query).first()
    query.created_at = new Date()

		if(isJoin){
			return response.status(200).json({error: 1, message: '用户已经参加该活动'})
		}else{
			const joinId = await Database.from(joinTable).insert(query)
			return response.status(200).json({joinId})
		}

	}

	async checkJoin({request, response}){
		const query = request.post()
		const joinId = await Database.table(joinTable).where(query).first()
		if(joinId){
			return response.status(200).json({joinId})
		}else{
			return response.status(200).json({error: 0, message: '用户未参加该活动'})
		}
	}

	async getJoin({request, response, params: {id}}){

		const query = request.get()
    const page = query.page || 1
    const perPage = 10
    const joinData = await Database.select(joinTable+'.*', userTable+'.avatarurl', userTable+'.nickname').from(joinTable)
      .leftJoin(userTable, joinTable+'.unionid', userTable+'.unionid')
      .where('activity_id', id)
      .paginate(page, perPage)

    const count = await Database.from(joinTable).where({activity_id: id, is_join: 1}).count()
    const join_count = count[0]['count(*)']

    const activityInfo = await Database.select('*').from(activityTable).where({id}).first()

    const oldFiles = await Database.select('photo_url').from(photoTable).where({activity_id: id})

		return response.status(200).json({joinData, join_count, activityInfo, oldFiles})
	}

	async changeActStatus({request, response}){

    const { id, ad_status, userInfo: { unionid }} = request.post()
    const activityId = await Database.from(activityTable).where({id, unionid}).update({ad_status})

    if(activityId){
      return response.status(200).json({ad_status})
    }else{
      return response.status(200).json({error: 0, message: '操作失败'})
    }

  }

  async uploadFile({request, response}){
    console.log(request)
    const {activity_id, userInfo:{unionid}} = request.post()
    const actId = await Database.table(activityTable).where({id: activity_id, unionid}).first()

    if(actId){
      const ThumbInfo = await globalFn.uploadPic(request, 'thumb_img', {upSize:3})
      console.log(ThumbInfo)
      let imgMsg = ''
      let picName = ''
      if(ThumbInfo && ThumbInfo.status=='error'){
        imgMsg += `Error: ${JSON.stringify(ThumbInfo.error)}`

        return response.status(200).json({error: 1, message: imgMsg})
      }
      if(ThumbInfo && ThumbInfo.status=='moved'){
        picName = ThumbInfo.fileName
        imgMsg += 'ok'

        const joinId = await Database.from(photoTable).insert({activity_id, photo_url: picName, created_at: new Date()})

        return response.status(200).json({picName, message: imgMsg})
      }

      return response.status(200).json({error: 1, message: 'error'})

    }else{
      return response.status(200).json({error: 1, message: 'fail'})
    }
  }

  async signActivity({request, response}){
	  const {id, activity_id, is_join, userInfo:{unionid}} = request.post()
    const actId = await Database.table(activityTable).where({id: activity_id, unionid}).first()

    if(actId){
      const joinId = await Database.from(joinTable).where({activity_id, id}).update({is_join, updated_at: new Date()})
      if(joinId){
        return response.status(200).json({check: true, is_join})
      }else{
        return response.status(200).json({error: 1, is_join, message: 'fail'})
      }
    }else{
      return response.status(200).json({error: 1, is_join, message: 'fail'})
    }
  }

  async getGlory({request, response}){
    const query = request.all()
    const page = query.page || 1
    const type = query.type || 0
    const perPage = 10

    if(type==0){
      const glory = await Database.select(userTable+'.nickname', userTable+'.avatarurl')
        .count(joinTable+'.unionid as number').from(joinTable)
        .leftJoin(userTable, joinTable+'.unionid', userTable+'.unionid')
        .where({'is_join': 1})
        .leftJoin(activityTable, joinTable+'.unionid', activityTable+'.unionid')
        .where({'ad_status': 2})
        .orderBy('number', 'desc')
        .groupBy(joinTable+'.unionid')
        .paginate(page, perPage)

      return response.status(200).json({glory})
    }else{
      const typeId = await Database.select('id').from(activityTable).where('act_type', type)
      const findId = typeId.map(item=>{
        return item.id
      })
      const glory = await Database.select(userTable+'.nickname', userTable+'.avatarurl')
        .count(joinTable+'.unionid as number').from(joinTable)
        .leftJoin(userTable, joinTable+'.unionid', userTable+'.unionid')
        .where({'is_join': 1})
        .leftJoin(activityTable, joinTable+'.unionid', activityTable+'.unionid')
        .where({'ad_status': 2})
        .whereIn('activity_id', findId)
        .orderBy('number', 'desc')
        .groupBy(joinTable+'.unionid')
        .paginate(page, perPage)

      return response.status(200).json({glory})
    }

  }

  async destroyPhoto({request, response}){
    const { activity_id, photo_url, userInfo:{unionid}} = request.post()
    const actId = await Database.table(activityTable).where({id: activity_id, unionid}).first()

    if(actId){
      const joinId = await Database.from(photoTable).where({activity_id, photo_url}).del()

      if(joinId){

        const oldPic = Helpers.appRoot('uploads/') + photo_url
        const exists = Drive.exists(oldPic)
        if(exists){
          Drive.delete(oldPic)
        }

        return response.status(200).json({joinId})

      }else{
        return response.status(200).json({error: 1})
      }

    }else{
      return response.status(200).json({error: 1, message: 'fail'})
    }
  }

}

module.exports = ActivityController
