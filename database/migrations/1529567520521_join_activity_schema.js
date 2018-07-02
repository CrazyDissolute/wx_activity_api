'use strict'

const Schema = use('Schema')

class JoinActivitySchema extends Schema {
  up () {
    this.create('join_activity', (table) => {
      table.increments()
      table.integer('activity_id', 8)
      table.string('unionid', 64)
      table.boolean('is_join', 2).defaultTo(0)
      table.timestamps()
    })
  }

  down () {
    this.drop('join_activity')
  }
}

module.exports = JoinActivitySchema
