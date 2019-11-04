import { GluegunToolbox } from 'gluegun'
import { CSharpClassProperty } from '../models/csharp-class-property'
import { CSharpClassPropertyType } from '../enums/csharpClassPropertyType'

module.exports = (toolbox: GluegunToolbox) => {
  const { prompt, print } = toolbox

  toolbox.dotnetCore = {
    generateDomain
  }

  async function generateDomain(
    fileName: string,
    askPropertyQuestions: boolean = true
  ) {
    if (askPropertyQuestions) {
      await _prompPropertyQuestions(fileName)
    }
  }

  async function _prompPropertyQuestions(fileName: string) {
    let property = new CSharpClassProperty()

    const nameResult = await prompt.ask([
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the property?: '
      }
    ])

    property.name = nameResult.name

    const propertyTypeValues = Object.keys(CSharpClassPropertyType).filter(
      k => CSharpClassPropertyType[k]
    )

    const typeResult = await prompt.ask([
      {
        type: 'radio',
        name: 'type',
        message: `Which type is the property "${property.name}"?:`,
        choices: propertyTypeValues
      }
    ])

    property.type = typeResult.type as any

    const requiredResult = await prompt.ask([
      {
        type: 'radio',
        name: 'required',
        message: `Is Required?:`,
        choices: ['Yes', 'No']
      }
    ])

    property.isRequired = requiredResult.required === 'Yes' ? true : false

    print.newline()

    const addMore = await prompt.ask([
      {
        type: 'radio',
        name: 'addAnotherProperty',
        message: `Want to add another property?:`,
        choices: ['Yes', 'No']
      }
    ])

    if (addMore.addAnotherProperty === 'Yes') {
      await _prompPropertyQuestions(fileName)
    }
  }
}
