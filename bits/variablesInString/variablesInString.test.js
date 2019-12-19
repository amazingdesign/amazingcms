const { check, replace, getValuesFromItem } = require('./variablesInString')

describe('Test for variablesInString - check function', () => {

  it('should return empty array if no match', () => {
    expect(check('')).toEqual([])
    expect(check('ala')).toEqual([])
    expect(check('{bracket}')).toEqual([])
    expect(check('{{bracket}')).toEqual([])
    expect(check('some {{bracket}{s} ')).toEqual([])
  })

  it('should return array of matches if found them', () => {
    expect(check('name {{name}} {{lastname}}')).toEqual(['name', 'lastname'])
    expect(check('{{ala}}')).toEqual(['ala'])
    expect(check('{{rocket}} {bracket}')).toEqual(['rocket'])
    expect(check(`
    multiline

    should {{also}}

    {{work}}
    `)).toEqual(['also', 'work'])
  })

})

describe('Test for variablesInString - replace function', () => {

  it('should return empty the same string if notching to replace', () => {
    expect(replace('')).toBe('')
    expect(replace('ala')).toBe('ala')
    expect(replace('{bracket}')).toBe('{bracket}')
    expect(replace('{{bracket}')).toBe('{{bracket}')
    expect(replace('some {{bracket}{s} ')).toBe('some {{bracket}{s} ')
  })

  it('should return replaced string if found them but no replacer passed', () => {
    expect(replace('name {{name}} {{lastname}}')).toBe('name  ')
    expect(replace('{{ala}}')).toBe('')
    expect(replace('{{rocket}} {bracket}')).toBe(' {bracket}')
    expect(replace(`
    multiline

    should {{also}}

    {{work}}
    `)).toBe(`
    multiline

    should 

    
    `)
  })

  it('should return replaced string if found them', () => {
    expect(
      replace(
        'name',
        { name: 'Ala', lastname: 'Kotowicz' }
      )
    ).toBe('name')
    expect(
      replace(
        'name {{name}} {{lastname}}',
        { name: 'Ala', lastname: 'Kotowicz' }
      )
    ).toBe('name Ala Kotowicz')
    expect(
      replace(
        '{{ala}}',
        { ala: 'ela' }
      )
    ).toBe('ela')
    expect(
      replace(
        '{{rocket}} {bracket}',
        { rocket: 'fuel' }
      )
    ).toBe('fuel {bracket}')
    expect(replace(`
    multiline

    should {{also}}

    {{work}}
    `, { also: 'ALSO', work: 'work well!' })
    ).toBe(`
    multiline

    should ALSO

    work well!
    `)
  })

})

describe('Test for variablesInString - getValuesFromItem function', () => {

  it('should produce right value', () => {
    const item = {
      name: 'Ala',
      lastname: 'Kotowicz',
      age: 100,
    }

    expect(getValuesFromItem('name', item)).toBe('Ala')
    expect(getValuesFromItem('age', item)).toBe(100)
    expect(getValuesFromItem('My name is {{name}}', item)).toBe('My name is Ala')
    expect(
      getValuesFromItem('My name is {{name}} and I am {{age}} years old!', item)
    ).toBe('My name is Ala and I am 100 years old!')
  })

})