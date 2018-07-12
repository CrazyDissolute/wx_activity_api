'use strict'

const Schema = use('Schema')

class FollowSchema extends Schema {
  up () {
    this.create('follow', (table) => {
      table.increments()
      table.string('unionid', 64)
      table.integer('theme_id', 8)
      table.timestamps()
    })
  }

  down () {
    this.drop('follow')
  }
}

module.exports = FollowSchema
