import path from 'path'
import glob from 'glob'
import htmlPlugin from 'html-webpack-plugin'
import cssExtract from 'mini-css-extract-plugin'
import ESLint from 'eslint-webpack-plugin'
import SassLint from 'sass-lint-webpack'
import purgecssPlugin from 'purgecss-webpack-plugin'
import { CleanWebpackPlugin as clean } from 'clean-webpack-plugin'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

function styleModules (mode) {
  const module = {
    test: /\.s[ac]ss$/i,
    use: [
      { loader: 'style-loader' },
      { loader: "css-loader", options: { sourceMap: !mode } },
      { loader: "sass-loader", options: { sourceMap: !mode } }
    ]
  }
  if (mode) {
    module.use.splice(0, 1, {
      loader: cssExtract.loader,
      options: { publicPath: '../' }
    })
    module.use.splice(2, 0, {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugins: [
            autoprefixer(),
            cssnano({ preset: ['default', { discardComments: { removeAll: true } }] })
          ]
        }
      }
    })
  }
  return module
}

function plugins(mode) {
  const plugins = [...glob.sync('./src/**/*.pug').map(pug => {
    const template = pug.split('/').pop()
    const filename = template.replace('pug', 'html')
    return new htmlPlugin({ template, filename, inject: 'body' })
  })]

  if(mode) {
    plugins.push(
      new cssExtract({ filename: 'css/style.css' }),
      new purgecssPlugin({ paths: glob.sync(`${path.resolve(__dirname, 'src')}/**/*`, { nodir: true })  }),
      new clean({ cleanOnceBeforeBuildPatterns: ['**/*'] })
    )
  } else {
    plugins.push(
      new SassLint({ failOnWarning: true }),
      new ESLint({
        exclude: '/node_modules/',
        extensions: ['js'],
        fix: true,
        failOnWarning: true,
      })
    )
  }

  return plugins
}

export default function(env, { mode }) {
  const isProd = mode === 'production'

  return {
    mode,
    stats: 'minimal',
    target: isProd ? 'node' : 'web',
    context: path.resolve(__dirname, 'src'),
    devtool: isProd ? false : 'source-map',
    devServer: {
      port: 80,
      clientLogLevel: 'error',
      // contentBase: path.join(__dirname, 'dist'),
      // hot: true,
      // useLocalIp: true
    },
    entry: {
      script: './js/entry.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: './js/[name].js',
    },
    module: {
      rules: [
        styleModules(isProd),
        {
          test: /\.pug$/i,
          use: [{
            loader: 'pug-loader',
            options: { pretty: true }
          }]
        },
        {
          test: /\.(jpg|png|svg|gif)$/i,
          type: 'asset',
          generator: { filename: 'img/[name][ext]' },
          parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
          use: [{
            loader: 'image-webpack-loader',
            options: {
              disable: !isProd,
              mozjpeg: {
                progressive: true,
                quality: 65,
              },
              optipng: { enabled: false },
              pngquant: {
                quality: [0.4, 0.6],
                speed: 1,
              },
              gifsicle: { interlaced: false },
              webp: { quality: 75 }
            }
          }]
        },
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: 'babel-loader'
        }
      ]
    },
    plugins: plugins(mode)
  }
}