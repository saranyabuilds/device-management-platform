FROM node:22-alpine AS build

WORKDIR /workspace

ENV CI=true
ENV NX_DAEMON=false
ENV HUSKY=0

RUN corepack enable

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps/admin-portal apps/admin-portal

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm nx build admin-portal --configuration=production

FROM nginx:1.29-alpine

COPY apps/admin-portal/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /workspace/dist/apps/admin-portal/browser /usr/share/nginx/html

RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx /var/cache/nginx /var/run/nginx.pid /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

USER nginx

CMD ["nginx", "-g", "daemon off;"]
