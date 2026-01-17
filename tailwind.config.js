/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1890ff', // Ant Design Blue
                secondary: '#595959',
                success: '#52c41a',
                warning: '#faad14',
                error: '#f5222d',
            }
        },
    },
    plugins: [],
}
