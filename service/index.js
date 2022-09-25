const knex = require('../connection')
const { PI_TABLE, SCHEMA } = require('../constant')
const { generateResponse } = require('../helper')

exports.service = async () => {

    try {
        const result = await getCurrentPi()

        const expectedDp = result.length ? Number(result[0].decimal_place) + 1 : 0
        const newPi = getNextPi(expectedDp)
        const { rows: upsertResult } = await upsertNewPi(newPi, expectedDp)
        return generateResponse(201, { value: upsertResult[0].payload.value.toString() })
    } catch (e) {
        console.error(e)
        return generateResponse(500, e.message)
    }
}

const getCurrentPi = async () => {
    return knex.select()
        .where('is_deleted', false)
        .from(`${SCHEMA}.${PI_TABLE}`)
}

const getNextPi = (expectedDp) => {
    let i = 1n
    let x = 3n * (10n ** BigInt(20 + expectedDp))
    let pi = x
    while (x > 0) {
        x = x * i / ((i + 1n) * 4n)
        pi += x / (i + 2n)
        i += 2n
    }
    let piValue = (pi / (10n ** 20n)).toString()
    return `3.${piValue.substring(1, piValue.length)}`
}

const upsertNewPi = (newPi, expectedDp) => {
    return knex.raw(`
        WITH set_previous_pi_as_inactive as (
            UPDATE
                public.pi
            SET
                is_deleted = true
            WHERE 
                is_deleted = false
            RETURNING (decimal_place + 1)
        ), 
        insert_new_pi as (
            INSERT INTO pi
            (payload, decimal_place, is_deleted, created_date, last_updated_date)
            VALUES('{ "value": "${newPi}" }', ${expectedDp}, false, current_timestamp, current_timestamp)
            returning *
        )
        select * from insert_new_pi ;
    `)
}