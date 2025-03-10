import { addVitePlugin } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ViteInspectAPI } from 'vite-plugin-inspect'
import Inspect from 'vite-plugin-inspect'
import type { ServerFunctions } from '../types'

export async function setup(nuxt: Nuxt, _functions: ServerFunctions) {
  const plugin = Inspect()
  addVitePlugin(plugin)

  let api: ViteInspectAPI | undefined

  nuxt.hook('vite:serverCreated', () => {
    api = plugin.api
  })

  nuxt.hook('devtools:customTabs', (tabs) => {
    tabs.push({
      name: 'builtin-vite-inspect',
      title: 'Inspect',
      icon: 'carbon-search',
      view: {
        type: 'iframe',
        src: `${nuxt.options.app.baseURL}/_nuxt/__inspect/`.replace(/\/\//g, '/'),
      },
    })
  })

  async function getComponentsRelationships() {
    const modules = (await api?.rpc.list())?.modules || []
    const vueModules = modules.filter(i => i.id.match(/\.vue($|\?v=)/))

    const graph = vueModules.map((i) => {
      function searchForVueDeps(id: string, seen = new Set<string>()): string[] {
        if (seen.has(id))
          return []
        seen.add(id)
        const module = modules.find(m => m.id === id)
        if (!module)
          return []
        return module.deps.flatMap((i) => {
          if (vueModules.find(m => m.id === i))
            return [i]
          return searchForVueDeps(i, seen)
        })
      }

      return {
        id: i.id,
        deps: searchForVueDeps(i.id),
      }
    })

    return graph
  }

  _functions.getComponentsRelationships = getComponentsRelationships
}
