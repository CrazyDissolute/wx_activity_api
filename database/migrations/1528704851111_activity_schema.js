'use strict'

const Schema = use('Schema')

class ActivitySchema extends Schema {
  up () {
    this.create('activity', (table) => {
      table.increments()
      table.string('unionid', 64)
      table.string('title', 255)
      table.dateTime('act_time')
      table.integer('act_type', 2)
      table.string('address', 255)
      table.string('address_name', 255)
      table.string('latitude', 48)
      table.string('longitude', 48)
      table.string('ad_code', 64)
      table.text('content')
      table.boolean('ad_status').defaultTo(false)
      table.timestamps()
    })
  }

  down () {
    this.drop('activity')
  }
}

module.exports = ActivitySchema
