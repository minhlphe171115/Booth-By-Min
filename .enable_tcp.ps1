$namespace = "root\Microsoft\SqlServer\ComputerManagement16"
$protocol = Get-WmiObject -Namespace $namespace -Class ServerNetworkProtocol -Filter "InstanceName='MSSQLSERVER' and ProtocolName='Tcp'"

if ($protocol.Enabled -eq $false) {
    Write-Host "Enabling TCP/IP for MSSQLSERVER..."
    $protocol.SetEnable()
    Write-Host "TCP/IP Enabled."
} else {
    Write-Host "TCP/IP is already enabled for MSSQLSERVER."
}

# Set IPAll TCP Port to 1433
Write-Host "Setting TCP Port to 1433..."
$tcpPort = Get-WmiObject -Namespace $namespace -Class ServerNetworkProtocolProperty -Filter "InstanceName='MSSQLSERVER' and ProtocolName='Tcp' and IPAddressName='IPAll' and PropertyName='TcpPort'"
$tcpPort.SetStringValue("1433")

$tcpDynamicPort = Get-WmiObject -Namespace $namespace -Class ServerNetworkProtocolProperty -Filter "InstanceName='MSSQLSERVER' and ProtocolName='Tcp' and IPAddressName='IPAll' and PropertyName='TcpDynamicPorts'"
$tcpDynamicPort.SetStringValue("")

# Restart the SQL Server service to apply changes
Write-Host "Restarting SQL Server service..."
Restart-Service -Name "MSSQLSERVER" -Force
Write-Host "Service restarted."
