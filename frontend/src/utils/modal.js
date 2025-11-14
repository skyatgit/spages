import { createApp, h } from 'vue'
import i18n from '@/locales'

// 简化的对话框组件
const SimpleModal = {
  name: 'SimpleModal',
  props: {
    title: String,
    message: String,
    type: String,
    confirmText: String,
    cancelText: String
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const handleConfirm = () => {
      emit('confirm')
    }
    const handleCancel = () => {
      emit('cancel')
    }

    return () => h('div', {
      class: 'modal-overlay',
      onClick: (e) => {
        if (e.target === e.currentTarget && props.type === 'confirm') {
          handleCancel()
        }
      }
    }, [
      h('div', { class: 'modal-container' }, [
        h('div', { class: 'modal-header' }, [
          h('h3', { class: 'modal-title' }, props.title)
        ]),
        h('div', { class: 'modal-body' }, [
          h('p', {}, props.message)
        ]),
        h('div', { class: 'modal-footer' }, [
          props.type === 'confirm' ? h('button', {
            class: 'btn btn-secondary',
            onClick: handleCancel
          }, props.cancelText) : null,
          h('button', {
            class: 'btn btn-primary',
            onClick: handleConfirm
          }, props.confirmText)
        ])
      ])
    ])
  }
}

export function useModal() {
  const createModal = (options, onResult) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // 添加样式
    if (!document.getElementById('modal-styles')) {
      const style = document.createElement('style')
      style.id = 'modal-styles'
      style.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          min-width: 400px;
          max-width: 500px;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .modal-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .modal-body {
          padding: 24px;
          color: #2c3e50;
          font-size: 15px;
          line-height: 1.6;
        }
        .modal-body p {
          margin: 0;
        }
        .modal-footer {
          padding: 16px 24px;
          background: #f8f9fa;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .modal-footer .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          outline: none;
        }
        .modal-footer .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .modal-footer .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .modal-footer .btn-secondary {
          background: white;
          color: #6c757d;
          border: 2px solid #dee2e6;
        }
        .modal-footer .btn-secondary:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
        }
      `
      document.head.appendChild(style)
    }

    const cleanup = () => {
      setTimeout(() => {
        try {
          app.unmount()
          if (document.body.contains(container)) {
            document.body.removeChild(container)
          }
        } catch (e) {
          console.error('Modal cleanup error:', e)
        }
      }, 0)
    }

    const app = createApp(SimpleModal, {
      ...options,
      onConfirm: () => {
        onResult(true)
        cleanup()
      },
      onCancel: () => {
        onResult(false)
        cleanup()
      }
    })

    app.use(i18n)
    app.mount(container)
  }

  const alert = (message, title = null) => {
    return new Promise((resolve) => {
      createModal({
        title: title || i18n.global.t('common.tip'),
        message,
        type: 'alert',
        confirmText: i18n.global.t('common.confirm')
      }, () => resolve(true))
    })
  }

  const confirm = (message, title = null) => {
    return new Promise((resolve) => {
      createModal({
        title: title || i18n.global.t('common.confirm'),
        message,
        type: 'confirm',
        confirmText: i18n.global.t('common.confirm'),
        cancelText: i18n.global.t('common.cancel')
      }, resolve)
    })
  }

  return {
    alert,
    confirm
  }
}
