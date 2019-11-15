import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'generate',
  alias: ['g'],
  run: async (toolbox: GluegunToolbox) => {
    const { print, parameters, usecase, repository } = toolbox

    if (parameters.first === 'usecase' || parameters.first === 'u') {
      await usecase.create()
      return
    } else if (parameters.first === 'repository' || parameters.first === 'r') {
      await repository.create()
      return
    } else {
      print.info('Command not found.')
      return
    }
  }
}
