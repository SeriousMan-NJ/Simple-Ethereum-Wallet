import React from 'react'
import './App.css'
import Web3 from 'web3'
import { throws } from 'assert'

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      accounts: [],
      sender: null,
      receiver: null,
      value: 0,
      password: "",
      is_connected: true,
      transactions: []
    }
  }

  componentDidMount() {
    this.refreshAccounts()

    // 주기적으로 지갑 정보를 업데이트한다.
    this.pooling = window.setInterval(() => this.refreshAccounts(), 5000);
  }
  componentWillUnmount() {
    window.clearInterval(this.pooling)
  }

  async refreshAccounts() {
    const web3 = new Web3('ws://141.223.85.151:8546')

    try {
      const addresses = await web3.eth.getAccounts()
      if (!this.state.sender) {
        this.setState({ sender: addresses[0] })
      }
      const accountsPromise = addresses.map(async address => {
        const balance = await web3.eth.getBalance(address)
        return {
          address,
          balance: Math.floor(balance / 10000000000000000) / 100 // 소수점 둘쨰자리까지 버림하여 표기
        }
      })

      const accounts = await Promise.all(accountsPromise)
      this.setState({ accounts, is_connected: true })
    } catch (e) {
      this.setState({ is_connected: false })
    }

    const transactionPromise = this.state.transactions.map(async t => {
      const tx = await web3.eth.getTransaction(t.tx_id)
      return {
        tx_id: tx.hash,
        block_hash: tx.blockHash
      }
    })
    const transactions = await Promise.all(transactionPromise)
    this.setState({ transactions })
  }

  displayAccounts() {
    return this.state.accounts.map(account =>
      <div className="Account" key={account.address}>
        <div className="Address">{account.address}</div>
        <div className="Balance">{account.balance} ETH</div>
      </div>
    )
  }

  displayTotal() {
    const total = this.state.accounts.reduce((acc, x) => acc + x.balance, 0)
    return (
      <div className="Account" key="total">
        <div className="Total">Total</div>
        <div className="Total-Balance">{total} ETH</div>
      </div>
    )
  }

  displayTransmitter() {
    const addresses = this.state.accounts.map(e => {
      return (
        <option key={e.address} value={e.address}>{e.address}</option>
      )
    })
    return (
      <div className="Item">
        <div className="Label">
          Transmitter
        </div>
        <div className="Transmitter-Form">
          <select onChange={e => this.setState({ sender: e.target.value })}>
            {addresses}
          </select>
        </div>
      </div>
    )
  }

  displayRecipient() {
    return (
      <div className="Item">
        <div className="Label">
          Recipient
        </div>
        <input onChange={e => this.setState({ receiver: e.target.value })} type="text" className="Recipient-Form" />
      </div>
    )
  }

  displayValue() {
    return (
      <div className="Item">
        <div className="Label">
          Value
        </div>
        <input onChange={e => this.setState({ value: e.target.value })} type="number" className="Value-Form" />
        <p>ETH</p>
      </div>
    )
  }

  displayPassword() {
    return (
      <div className="Item">
        <div className="Label">
          Password
        </div>
        <input onChange={e => this.setState({ password: e.target.value })} type="password" className="Password-Form" />
        <input onClick={() => this.transfer()} type="button" value="send" />
      </div>
    )
  }

  transfer() {
    const web3 = new Web3('ws://141.223.85.151:8546')
    const batch = new web3.BatchRequest()
    web3.eth.personal.unlockAccount(this.state.sender, this.state.password, 30, (err) => {
      if (err) {
        window.alert("unlockAccount failed")
        return
      }

      web3.eth.sendTransaction({
        from: this.state.sender,
        to: this.state.receiver,
        value: web3.utils.toWei(this.state.value, "ether")
      }, (err, hash) => {
        if (err) {
          window.alert("sendTransaction failed")
          return
        }

        const { transactions } = this.state
        transactions.push({
          tx_id: hash,
          staus: "Pending"
        })
        this.setState({ transactions })

        web3.eth.personal.lockAccount(this.state.sender, (err, result) => {
          if (!result) {
            window.alert("lockAccount failed")
            return
          }
        })
      })
    })
  }

  displayConnectionStatus() {
    if (this.state.is_connected) {
      return (
        <div className="Connection-Status-Right">
          Connectted
        </div>
      )
    }
    return (
      <div className="Connection-Status-Wrong">
        Connection Lost
      </div>
    )
  }

  async showTransaction(txId) {
    const web3 = new Web3('ws://141.223.85.151:8546')
    const tx = await web3.eth.getTransaction(txId)
    window.alert(JSON.stringify(tx))
  }

  async showBlock(txId) {
    const web3 = new Web3('ws://141.223.85.151:8546')
    const tx = await web3.eth.getTransaction(txId)
    const block = await web3.eth.getBlock(tx.blockHash)
    window.alert(JSON.stringify(block))
  }

  displayTransactions() {
    return this.state.transactions.map(t =>
      <div className="Transaction" key={t.tx_id}>
        <div className="Tx-Id">{t.tx_id}</div>
        <div className="Tx-Status">{t.block_hash ? "Done" : "Pending"}</div>
        <button onClick={() => this.showTransaction(t.tx_id)}>TX</button>
        {t.block_hash ? <button onClick={() => this.showBlock(t.tx_id)}>BLOCK</button> : null}
      </div>
    )
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>Simple Ethereum Wallet</p>
        </header>
        {this.displayConnectionStatus()}
        <div className="Accounts">
          {this.displayAccounts()}
          {this.displayTotal()}
        </div>
        <div className="Sending">
          {this.displayTransmitter()}
          {this.displayRecipient()}
          {this.displayValue()}
          {this.displayPassword()}
        </div>
        <div className="Transactions">
          <p>Transaction List</p>
          {this.displayTransactions()}
        </div>
      </div>
    )
  }
}

export default App
