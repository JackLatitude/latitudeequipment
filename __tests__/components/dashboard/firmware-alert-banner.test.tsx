import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirmwareAlertBanner } from '@/app/dashboard/_components/firmware-alert-banner'

const DISMISS_KEY = 'firmware-alert-dismissed'

describe('FirmwareAlertBanner', () => {
  beforeEach(() => sessionStorage.clear())

  it('shows the count when items need updating', () => {
    render(<FirmwareAlertBanner count={3} />)
    expect(screen.getByText(/3 items need/)).toBeInTheDocument()
  })

  it('uses the singular for one item', () => {
    render(<FirmwareAlertBanner count={1} />)
    expect(screen.getByText(/1 item needs/)).toBeInTheDocument()
  })

  it('renders nothing when no items need updating', () => {
    const { container } = render(<FirmwareAlertBanner count={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('stays hidden when already dismissed this session', () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    const { container } = render(<FirmwareAlertBanner count={3} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('hides itself and records the dismissal when dismissed', async () => {
    const user = userEvent.setup()
    render(<FirmwareAlertBanner count={3} />)

    await user.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(screen.queryByText(/items need/)).not.toBeInTheDocument()
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe('1')
  })
})
