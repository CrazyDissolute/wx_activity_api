'use strict'

const Database = use('Database')

const Helpers = use('Helpers')

const axios = use('axios')

const fs = use('fs')

const got = use('got')

class GlobalFnClass {

  //结合表单与表中字段有效的数据
  static async formatSubmitData(tablename, data) {
    const tableField = await Database.table(tablename).columnInfo()
    const body = data;
    let fieldData = { ...tableField }
    delete fieldData.id
    let saveData = {}
    for (let key in fieldData) {
      if (body.hasOwnProperty(key)) {
        saveData[key] = body[key]
      }
    }
    return saveData
  }

  static pushMsg(cachedUsers, postData){
    return new Promise((resolve,reject)=>{
      resolve(got.post(`https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=${cachedUsers}`,{body: JSON.stringify(postData)}))
    })
	  //return await got.post(`https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=${cachedUsers}`,{body: JSON.stringify(postData)})

  }

  static saveFile(filePath, fileData) {
	  return new Promise((resolve, reject) => {
	   // 块方式写入文件
	   const wstream = fs.createWriteStream(filePath);

	   wstream.on('open', () => {
	    const blockSize = 128;
	    const nbBlocks = Math.ceil(fileData.length / (blockSize));
	    for (let i = 0; i < nbBlocks; i += 1) {
	     const currentBlock = fileData.slice(
	      blockSize * i,
	      Math.min(blockSize * (i + 1), fileData.length),
	     );
	     wstream.write(currentBlock);
	    }

	    wstream.end();
	   });
	   wstream.on('error', (err) => { reject(err); });
	   wstream.on('finish', () => { resolve(true); });
	  });
	 }

  static async uploadPic(requestFile, picFile, {width=450, height=450, upSize=3}, path="upload"){
    //console.log(requestFile)

    const profilePic = requestFile.file(picFile, {
      types: ['image'],
      size: upSize+'mb'
    })

    //console.log(profilePic)

    if(profilePic){

      if(profilePic && profilePic.clientName){

        await profilePic.move(Helpers.appRoot(path), {
          name: `${(new Date().getTime()).toString(32)+Math.random().toString(16).substr(2)}.${profilePic.clientName.replace(/^.+\./,'')}`
        })

        if (!profilePic.moved()) {
          return {fileName: '', status: 'error', error: profilePic.error()}
        }

        return {fileName: profilePic.fileName, status: 'moved', error: {}}
      }

    }

    return {fileName: '', status: 'error', error: profilePic.error()}
  }
}

module.exports = GlobalFnClass
