// Fill hosts with public IPs/hostnames where ZMQ-RPC listens on port 19995
module.exports = [
  { name: 'Node1', host: 'node1.arqma.com', url: 'http://node1.arqma.com:19994/get_info' },
  { name: 'Node2', host: 'node2.arqma.com', url: 'http://node2.arqma.com:19994/get_info' },
  { name: 'Node3', host: 'node3.arqma.com', url: 'http://node3.arqma.com:19994/get_info' },
  { name: 'Node4', host: 'node4.arqma.com', url: 'http://node4.arqma.com:19994/get_info' },
  { name: 'Pool',  host: '127.0.0.1',       url: 'http://127.0.0.1:19998/get_info' }
];
