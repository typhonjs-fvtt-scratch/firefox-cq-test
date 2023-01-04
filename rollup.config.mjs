import autoprefixer        from 'autoprefixer';
import postcss             from 'rollup-plugin-postcss';
import postcssPresetEnv    from 'postcss-preset-env';
import resolve             from '@rollup/plugin-node-resolve';
import svelte              from 'rollup-plugin-svelte';
import preprocess          from 'svelte-preprocess';

const postcssMain = {
   inject: false,
   extract: 'init.css',
   extensions: ['.scss', '.sass', '.css'],
   plugins: [autoprefixer, postcssPresetEnv],
   use: ['sass']
};

const s_RESOLVE_CONFIG = {
   browser: true,
   dedupe: ['svelte', '@typhonjs-fvtt/runtime', '@typhonjs-fvtt/svelte-standard']
}

export default () =>
{
   return [
      {
         input: `src/init.js`,
         output: {
            file: `public/init.js`,
            format: 'es'
         },
         plugins: [
            svelte({
               preprocess: preprocess()
            }),
            postcss(postcssMain),
            resolve(s_RESOLVE_CONFIG)
         ]
      }
   ];
};
