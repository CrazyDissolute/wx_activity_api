'use strict'

const Schema = use('Schema')
const Database = use('Database')

class ThemeSchema extends Schema {
  up () {
    this.create('themes', (table) => {
      table.increments()
      table.string('title', 255)
      table.timestamps()
    })

    this.schedule(async (trx) => {
      let rows = [
        {id:1,title:"学习分享会"},
        {id:2,title:"羽毛球"},
        {id:3,title:"篮球"},
        {id:4,title:"游泳"},
        {id:5,title:"瑜伽"},
        {id:6,title:"其它"}
      ]
      await Database.table('themes').transacting(trx).insert(rows)
    })

  }

  down () {
    this.drop('themes')
  }
}

module.exports = ThemeSchema
