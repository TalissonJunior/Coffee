import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'update',
  alias: ['u'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      dotnetcore
    } = toolbox

    await dotnetcore.updateEntities();
    await dotnetcore.updateDomains();
  }
}
