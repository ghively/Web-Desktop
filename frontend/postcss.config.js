import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
    plugins: [
        tailwindcss,
        autoprefixer({
            grid: true, // Enable CSS Grid prefixes
            flexbox: 'no-2009', // Use modern flexbox syntax
            supports: true, // Enable @supports prefixes
            overrideBrowserslist: [
                '> 1%',
                'last 2 versions',
                'not dead',
                'not ie <= 11'
            ]
        }),
    ],
}
