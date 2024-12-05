import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
    typescript: {
        tsconfigPath: './tsconfig.next.json',
    },
};

export default nextConfig