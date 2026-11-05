// 工具渲染容器: 单个工具的懒加载 + 错误兜底
//
// 每个工具都是独立组件 (无 props), 出异常时只坏当前工具, 不会白屏整个 WebView。

import React, { Suspense } from 'react';
import { Alert, Spin } from 'antd';
import { appMetaOf, pageOf } from './registry';

interface Props {
  appKey: string;
}

class ToolBoundary extends React.Component<
  { appKey: string; children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { appKey: string; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { appKey: string }) {
    // 切换工具后清掉上一个工具的错误状态
    if (prev.appKey !== this.props.appKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          message="工具加载失败"
          description={String(error?.message ?? error)}
        />
      );
    }
    return this.props.children;
  }
}

/** 渲染指定工具 */
export function ToolPane({ appKey }: Props) {
  const Page = pageOf(appKey);
  const meta = appMetaOf(appKey);

  if (!Page) {
    return <Alert type="warning" showIcon message={`未找到工具: ${appKey}`} />;
  }

  return (
    <ToolBoundary appKey={appKey}>
      <Suspense
        fallback={
          <div className="mt-loading">
            <Spin />
            <span>{meta ? `正在加载 ${meta.name}…` : '正在加载…'}</span>
          </div>
        }
      >
        <Page />
      </Suspense>
    </ToolBoundary>
  );
}
