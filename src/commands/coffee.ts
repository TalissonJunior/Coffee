import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'coffee',
  run: async (toolbox: GluegunToolbox) => {
    const { designer } = toolbox

    await designer.test();
  }
}
