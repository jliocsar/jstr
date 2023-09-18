await Bun.build({
  entrypoints: ['./jstr.js'],
  outdir: './dist',
  target: 'node',
  minify: true,
})
